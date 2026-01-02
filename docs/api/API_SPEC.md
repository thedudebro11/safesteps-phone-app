### `docs/api/API_SPEC.md`
```md
# SafeSteps — API Specification (V1)

_V1 is Supabase-first._  
Most authenticated operations are done directly via Supabase (RLS enforced).  
Public share viewing requires a server-side surface (Edge Function or backend) so raw tokens are never queried client-side.

---

## 1) Authenticated App Data (Supabase)

### 1.1 Contacts
- Table: `trusted_contacts`
- Operations:
  - list contacts for current user
  - insert/update/delete contact
- Security: RLS by `user_id = auth.uid()`

### 1.2 Location Pings
- Table: `location_pings`
- Operations:
  - insert ping (ACTIVE / EMERGENCY)
  - list pings (History)
- Security: RLS by `user_id = auth.uid()`

### 1.3 Share Sessions
- Tables:
  - `share_sessions`
  - `share_recipients` (token hashes)
- Operations:
  - create session (with expiration)
  - create per-recipient token hash rows
  - revoke/end session
  - list active sessions (Shares tab)
- Security: RLS by `user_id = auth.uid()`

---

## 2) Public Share Viewer (Recommended Edge Function)

Because viewers do not authenticate, token validation must happen server-side.

### 2.1 GET latest location for a share token

**Endpoint (Edge Function or backend):**
- `GET /share/latest?token=<raw_token>`

**Behavior:**
- hash `token` server-side (SHA-256)
- lookup `share_recipients.token_hash`
- ensure recipient + session are `active` and not expired
- fetch latest ping for the owner/session
- return minimal payload

**Response (example):**
```json
{
  "status": "LIVE",
  "expiresAt": "2026-01-01T20:10:00.000Z",
  "lastUpdatedAt": "2026-01-01T19:58:10.000Z",
  "lat": 40.72936,
  "lng": -73.99363,
  "accuracyM": 5.0,
  "mode": "normal"
}
Status derivation for viewer:

LIVE / STALE / OFFLINE (revoked/expired)

SERVICE_DOWN when function not reachable

2.2 POST revoke token (viewer “stop receiving”) (optional V1+)
POST /share/revoke

json
Copy code
{ "token": "<raw_token>" }
Server:

hash token

set share_recipients.status = 'revoked'

3) Guest Sharing (Optional; if enabled)
Guest mode is local-only by default.
If guest share links are allowed in V1, they require a relay surface (Edge Function/back-end) because guests have no auth.uid().

Suggested endpoints:

POST /guest/share/start

POST /guest/share/ping

POST /guest/share/stop

These must be rate-limited and expiration-enforced.

4) Auth for Server Surfaces
If using a backend/edge function for authenticated operations:

require Authorization: Bearer <supabase_access_token>

verify JWT using Supabase

If using only Supabase tables:

client uses Supabase session directly (RLS enforced)

5) Security Requirements (Non-negotiable)
Share tokens are high entropy

Store only token hashes in DB

Never allow anonymous reads on user tables

Public viewer access must be mediated by server code (Edge Function/back-end)

Add rate limiting on token endpoints