# SafeSteps — Database Schema (Supabase/Postgres, V1)

_Last updated: 2026-05-12_

All user-owned tables enforce **Row Level Security (RLS)** using `auth.uid()`.
Server-side writes use the service role key (bypasses RLS intentionally for admin ops).

---

## Tables

### 1. `profiles`

One row per authenticated user. Created/upserted by `AuthProvider` on session load.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK, matches `auth.users.id` |
| `email` | text | nullable |
| `display_name` | text | nullable |
| `avatar_url` | text | nullable — public Supabase Storage URL, cache-busted with `?t=<timestamp>` on upload |

Used by: trust list, live visibility, emergency alert copy, map markers.

#### Avatar Storage

Profile photos are stored in the **`avatars`** Supabase Storage bucket (public).

- Path convention: `{user_id}/avatar.{ext}`
- Upload: client-side via `supabase.storage.from('avatars').upload()` using `expo-image-picker`
- RLS policies:
  - **INSERT/UPDATE**: authenticated users can only write to their own `{user_id}/` folder
  - **SELECT**: public (anyone can read — required for map markers to load avatars)
- `avatar_url` is set to `null` when user removes their photo

---

### 2. `trusted_contacts`

Bidirectional trust-request model. Each row is a directional relationship.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `requester_user_id` | uuid | user who sent the request |
| `requested_user_id` | uuid | user who received the request |
| `status` | text | `pending` \| `accepted` \| `denied` |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | updated on accept/deny |

**Acceptance creates a reciprocal row** — when A accepts B's request, a second row is upserted (`requester=A, requested=B, status=accepted`) so each user has an outbound accepted record pointing to the other.

Unique constraint: `(requester_user_id, requested_user_id)`

---

### 3. `live_presence`

Ephemeral live location. One row per user (upserted on each ping). Expires 90s after last ping.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | PK / unique |
| `lat` | float8 | required |
| `lng` | float8 | required |
| `accuracy_m` | float8 | nullable |
| `mode` | text | `active` \| `emergency` |
| `updated_at` | timestamptz | set on every upsert |
| `expires_at` | timestamptz | now() + 90s, set on every upsert |

Deleted immediately by `POST /api/presence/stop`.

---

### 4. `live_visibility`

Directional permission: owner decides whether viewer can see them on the map.

| Column | Type | Notes |
|---|---|---|
| `owner_user_id` | uuid | the user granting/denying visibility |
| `viewer_user_id` | uuid | the user who can/cannot see them |
| `can_view` | boolean | true = viewer sees owner live |
| `updated_at` | timestamptz | updated on toggle |

Unique constraint: `(owner_user_id, viewer_user_id)`

Only writable by the owner via `POST /api/visibility/set`. Trust must be accepted before this row can be set.

---

### 5. `location_history`

Append-only event log. Written on every ping (active or emergency). Never mutated.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | owner |
| `lat` | float8 | required |
| `lng` | float8 | required |
| `accuracy_m` | float8 | nullable |
| `mode` | text | `active` \| `emergency` |
| `created_at` | timestamptz | default now() |

Written by server (service role) from `POST /api/locations` and `POST /api/emergency`.
Read by `GET /api/history`.

---

### 6. `push_tokens`

Expo push tokens for delivering emergency notifications. Multiple devices per user supported.

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid | owner |
| `expo_push_token` | text | must start with `ExponentPushToken[` |
| `platform` | text | `ios` \| `android` |
| `updated_at` | timestamptz | updated on re-registration |

Unique constraint: `(user_id, expo_push_token)` — upserted on register so re-registration is safe.

Registered via `POST /api/push/register`, read by `POST /api/emergency/alert`.

---

### 7. `emergency_alerts`

Audit log for emergency alert sends. Used for deduplication (90s window).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `sender_user_id` | uuid | who triggered the alert |
| `recipient_count` | int | number of tokens dispatched |
| `deduped` | boolean | true = suppressed within dedup window |
| `triggered_at` | timestamptz | default now() |

`deduped=false` rows within the last 90s block a new send (prevents rapid re-taps from spamming contacts).

---

## Share Sessions (DB-Backed, V1)

Share sessions are persisted in Supabase via `server/routes/shares.js`.

**`share_sessions`** — one row per sharing session

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `owner_user_id` | uuid | user who started the share |
| `status` | text | `live` \| `ended` |
| `reason` | text | `manual` \| `emergency` |
| `created_at` | timestamptz | default now() |
| `ended_at` | timestamptz | nullable |

**`share_recipients`** — per-recipient row within a session

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `session_id` | uuid | FK → share_sessions.id |
| `token_hash` | text | SHA-256 of the raw token — raw token never stored |
| `contact_user_id` | uuid | nullable |
| `created_at` | timestamptz | default now() |

Token hashing: `crypto.createHash('sha256').update(rawToken).digest('hex')` — raw tokens are returned to the client once and never persisted.

---

## Postgres Functions (RPC)

### `get_visible_users(viewer_id uuid)`

Single-query replacement for the previous 4-step live visibility fetch.

**Returns:** presence + profile data for all users the viewer is permitted to see.

**Logic (single JOIN):**
1. `live_presence` — only non-expired rows
2. INNER JOIN `live_visibility` — owner must have granted `can_view = true` to this viewer
3. INNER JOIN `trusted_contacts` — must be an accepted trust relationship
4. LEFT JOIN `profiles` — attach display_name, email, avatar_url

**Why SECURITY DEFINER:** runs with elevated privileges inside Postgres, eliminating 3 extra round trips from Railway → Supabase. Called via `supabaseAdmin.rpc('get_visible_users', { viewer_id })`.

**Performance impact:** reduces `/api/live/visible` from 4 sequential DB queries (~80–160ms network overhead) to 1 (~20–40ms).
