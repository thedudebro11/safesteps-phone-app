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

Used by: trust list, live visibility, emergency alert copy.

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

## Share Sessions (In-Memory, V1)

Share sessions are **not** in the database yet. They are stored in an in-memory `Map` in `server/index.js`:

```
sharesByToken: Map<token, { token, status, blocked, reason, createdAt, endedAt }>
```

Status values: `live` | `ended`

Endpoints:
- `POST /api/shares/start` — register token as live
- `POST /api/shares/end` — mark ended
- `POST /api/shares/:token/block` — mark blocked

**Implication:** share state resets on server restart. Persisting this to a DB table is a planned upgrade.

---

## Planned: DB-Backed Share Sessions

When share sessions are moved to the DB, the intended schema is:

**`share_sessions`** — time-bound sharing session  
**`share_recipients`** — per-recipient token hashes (never store raw tokens)

See `docs/sharing-and-tracking.md` for the full design when implementing.
