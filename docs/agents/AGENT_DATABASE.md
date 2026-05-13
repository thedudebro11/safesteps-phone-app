# Agent: Database

**Role:** Create and verify all Supabase schema migrations needed for production. This agent runs first — nothing else can proceed until the DB is correct.

---

## Step 1: Read These First (in order)

1. `CLAUDE.md` — project rules + known stubs
2. `docs/agents/STATUS.md` — check Phase 1 tasks
3. `docs/db/DB_SCHEMA.md` — authoritative schema (source of truth)
4. `docs/SYSTEM_ARCHITECTURE.md` — understand how the app uses the DB
5. `docs/api/API_SPEC.md` — see which tables each endpoint touches

---

## Step 2: Understand Current State

These tables **already exist** in Supabase (verified from server code):
- `profiles` — `(user_id, email, display_name)`
- `trusted_contacts` — `(id, requester_user_id, requested_user_id, status, created_at, updated_at)`
- `live_presence` — `(user_id, lat, lng, accuracy_m, mode, updated_at, expires_at)`
- `live_visibility` — `(owner_user_id, viewer_user_id, can_view, updated_at)`
- `location_history` — `(id, user_id, lat, lng, accuracy_m, mode, created_at)`
- `push_tokens` — `(user_id, expo_push_token, platform, updated_at)`
- `emergency_alerts` — `(id, sender_user_id, recipient_count, deduped, triggered_at)`

These tables **do NOT exist yet** and must be created:
- `share_sessions`
- `share_recipients`

---

## Step 3: Your Tasks

### 3.1 Verify Existing Tables

For each existing table, confirm via Supabase dashboard or SQL:
- Column names and types match `DB_SCHEMA.md`
- RLS is enabled
- Required indexes exist

**Critical indexes to verify:**
```sql
-- location_history
CREATE INDEX IF NOT EXISTS idx_location_history_user_created
ON public.location_history (user_id, created_at DESC);

-- push_tokens
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_token
ON public.push_tokens (user_id, expo_push_token);

-- trusted_contacts
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_contacts_pair
ON public.trusted_contacts (requester_user_id, requested_user_id);

-- live_visibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_visibility_pair
ON public.live_visibility (owner_user_id, viewer_user_id);

-- emergency_alerts
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_sender_triggered
ON public.emergency_alerts (sender_user_id, triggered_at DESC);
```

### 3.2 Create `share_sessions` Table

```sql
CREATE TABLE IF NOT EXISTS public.share_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'revoked', 'expired', 'ended')),
  reason text NOT NULL DEFAULT 'manual'
    CHECK (reason IN ('manual', 'emergency')),
  contact_id uuid,
  contact_snapshot jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_sessions_user_status
ON public.share_sessions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_share_sessions_user_created
ON public.share_sessions (user_id, created_at DESC);

ALTER TABLE public.share_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_sessions_owner_select"
ON public.share_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "share_sessions_owner_insert"
ON public.share_sessions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "share_sessions_owner_update"
ON public.share_sessions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "share_sessions_owner_delete"
ON public.share_sessions FOR DELETE
USING (user_id = auth.uid());
```

### 3.3 Create `share_recipients` Table

**IMPORTANT:** Store only `token_hash` (SHA-256 of the raw token). Never store raw tokens.

```sql
CREATE TABLE IF NOT EXISTS public.share_recipients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  share_session_id uuid NOT NULL
    REFERENCES public.share_sessions(id) ON DELETE CASCADE,
  contact_user_id uuid,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (share_session_id, contact_user_id),
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_share_recipients_user
ON public.share_recipients (user_id);

CREATE INDEX IF NOT EXISTS idx_share_recipients_session
ON public.share_recipients (share_session_id);

ALTER TABLE public.share_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "share_recipients_owner_select"
ON public.share_recipients FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "share_recipients_owner_insert"
ON public.share_recipients FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "share_recipients_owner_update"
ON public.share_recipients FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "share_recipients_owner_delete"
ON public.share_recipients FOR DELETE
USING (user_id = auth.uid());
```

### 3.4 Verify `live_presence` expiry cleanup

Confirm that either:
- A Supabase scheduled function/pg_cron job cleans up expired rows periodically, OR
- The `expires_at > now()` filter in `GET /api/live/visible` is sufficient (it is for V1)

---

## Step 4: Update Docs When Done

1. Update `docs/db/DB_SCHEMA.md` — add `share_sessions` and `share_recipients` sections
2. Update `docs/agents/STATUS.md` — mark Phase 1 tasks complete
3. Add entry to `docs/CHANGELOG.md` under `[Unreleased]`

---

## Definition of Done

- All existing tables verified against DB_SCHEMA.md
- `share_sessions` and `share_recipients` tables created with RLS enabled
- All required indexes confirmed
- DB_SCHEMA.md updated to reflect final state
- STATUS.md Phase 1 all marked `[x]`
