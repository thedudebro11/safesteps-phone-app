# SafeSteps — Database Schema (Supabase/Postgres, V1)

All user-owned tables enforce **Row Level Security (RLS)** using `auth.uid()`.

This schema supports:
- trusted contacts
- location pings (normal + emergency)
- share sessions (time-bound)
- recipient tokens (hashed)

---

## 0) Extensions

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

1) Table: trusted_contacts

Represents a user's trusted recipients.

Columns
Column	Type	Notes
id	uuid	PK, uuid_generate_v4()
user_id	uuid	FK-ish to auth.users.id (RLS scoped)
name	text	required
contact_phone	text	nullable
contact_email	text	nullable
created_at	timestamptz	default now()
updated_at	timestamptz	default now()
SQL
create table if not exists public.trusted_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  name text not null,
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trusted_contacts_user_id_idx
  on public.trusted_contacts (user_id);

RLS
alter table public.trusted_contacts enable row level security;

create policy "trusted_contacts_owner_select"
on public.trusted_contacts for select
using (user_id = auth.uid());

create policy "trusted_contacts_owner_insert"
on public.trusted_contacts for insert
with check (user_id = auth.uid());

create policy "trusted_contacts_owner_update"
on public.trusted_contacts for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "trusted_contacts_owner_delete"
on public.trusted_contacts for delete
using (user_id = auth.uid());

2) Table: location_pings

Stores pings for authenticated users (guest stays local).

Columns
Column	Type	Notes
id	uuid	PK
user_id	uuid	owner
lat	double precision	required
lng	double precision	required
accuracy_m	double precision	nullable
recorded_at	timestamptz	device timestamp
created_at	timestamptz	server timestamp, default now()
mode	text	normal | emergency
source	text	user | share (optional)
shared_to_contact_id	uuid	nullable FK to trusted_contacts.id (labeling)
share_session_id	uuid	nullable FK to share_sessions.id
place_name	text	nullable (reverse geocode cache)
place_address	text	nullable
SQL
create table if not exists public.location_pings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  mode text not null default 'normal' check (mode in ('normal','emergency')),
  source text not null default 'user' check (source in ('user','share')),
  shared_to_contact_id uuid,
  share_session_id uuid,
  place_name text,
  place_address text
);

create index if not exists location_pings_user_id_created_at_idx
  on public.location_pings (user_id, created_at desc);

create index if not exists location_pings_user_id_recorded_at_idx
  on public.location_pings (user_id, recorded_at desc);

RLS
alter table public.location_pings enable row level security;

create policy "location_pings_owner_select"
on public.location_pings for select
using (user_id = auth.uid());

create policy "location_pings_owner_insert"
on public.location_pings for insert
with check (user_id = auth.uid());

create policy "location_pings_owner_delete"
on public.location_pings for delete
using (user_id = auth.uid());

3) Table: share_sessions

A time-bound sharing session owned by a user.
A session can have one or more recipients via share_recipients.

Columns
Column	Type	Notes
id	uuid	PK
user_id	uuid	owner
status	text	active | paused | revoked | expired
started_at	timestamptz	default now()
expires_at	timestamptz	required
created_at	timestamptz	default now()
updated_at	timestamptz	default now()
SQL
create table if not exists public.share_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  status text not null default 'active'
    check (status in ('active','paused','revoked','expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists share_sessions_user_id_status_idx
  on public.share_sessions (user_id, status);

create index if not exists share_sessions_user_id_expires_at_idx
  on public.share_sessions (user_id, expires_at);

RLS
alter table public.share_sessions enable row level security;

create policy "share_sessions_owner_select"
on public.share_sessions for select
using (user_id = auth.uid());

create policy "share_sessions_owner_insert"
on public.share_sessions for insert
with check (user_id = auth.uid());

create policy "share_sessions_owner_update"
on public.share_sessions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "share_sessions_owner_delete"
on public.share_sessions for delete
using (user_id = auth.uid());

4) Table: share_recipients (token hashes)

Each row represents a recipient-specific token for a share session.

Important: Store only hashes of tokens, never raw tokens.

Columns
Column	Type	Notes
id	uuid	PK
user_id	uuid	owner (duplicated for RLS convenience)
share_session_id	uuid	FK → share_sessions.id
contact_id	uuid	FK → trusted_contacts.id
token_hash	text	required (e.g., hex of SHA-256)
status	text	active | revoked | expired
created_at	timestamptz	default now()
SQL
create table if not exists public.share_recipients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,
  share_session_id uuid not null references public.share_sessions(id) on delete cascade,
  contact_id uuid not null references public.trusted_contacts(id) on delete cascade,
  token_hash text not null,
  status text not null default 'active'
    check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  unique (share_session_id, contact_id),
  unique (token_hash)
);

create index if not exists share_recipients_user_id_idx
  on public.share_recipients (user_id);

create index if not exists share_recipients_session_id_idx
  on public.share_recipients (share_session_id);

RLS (owner only)
alter table public.share_recipients enable row level security;

create policy "share_recipients_owner_select"
on public.share_recipients for select
using (user_id = auth.uid());

create policy "share_recipients_owner_insert"
on public.share_recipients for insert
with check (user_id = auth.uid());

create policy "share_recipients_owner_update"
on public.share_recipients for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "share_recipients_owner_delete"
on public.share_recipients for delete
using (user_id = auth.uid());

5) Viewer Access (Public)

Do not open tables publicly.

Instead, use one of:

Supabase Edge Function (recommended): given a raw token, hash it server-side, fetch latest ping for that session, return minimal payload.

Backend endpoint (optional): same as above.

This avoids weakening RLS and keeps token validation server-side.