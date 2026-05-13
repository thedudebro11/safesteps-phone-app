# SafeSteps — API Specification (V1)

_Last updated: 2026-05-12_

The backend is a Node/Express server (`server/index.js`) deployed on Railway.
All authenticated routes validate the Supabase JWT via `requireUser` middleware.

Base URL (production): `lume-production-ca82.up.railway.app`

---

## Authentication

Protected routes require:
```
Authorization: Bearer <supabase_access_token>
```

The access token is the user's Supabase JWT (`session.access_token`).
Tokens are validated server-side using `supabaseAuth.auth.getUser(token)`.

`REQUIRE_AUTH=true` enforces auth on all routes. In dev it defaults to permissive.

---

## Routes

### Health

#### `GET /health`
No auth required.
```json
{ "ok": true }
```

---

### Locations

#### `POST /api/locations`
Submit an active tracking ping. Upserts `live_presence` and appends to `location_history`.

**Auth:** Bearer token (authed path) or guest share token (guest path)

**Body (authed):**
```json
{ "lat": number, "lng": number, "accuracyM": number | null }
```

**Response:**
```json
{ "ok": true, "accepted": true, "mode": "authed" }
```

---

#### `POST /api/presence/stop`
Delete the caller's `live_presence` row immediately (instant disappearance from other maps).

**Auth:** Bearer token required

**Response:**
```json
{ "ok": true }
```

---

### Emergency

#### `POST /api/emergency`
Submit an emergency ping. Same as `/api/locations` but writes `mode: "emergency"` to `live_presence` and `location_history`.

**Auth:** Bearer token (authed path) or guest share token (guest path)

**Body:**
```json
{ "lat": number, "lng": number, "accuracyM": number | null }
```

**Response:**
```json
{ "ok": true, "accepted": true, "mode": "authed" }
```

---

#### `POST /api/emergency/alert`
Send emergency push notifications to all eligible trusted contacts.

Eligibility: accepted trust in either direction (contacts sender invited + contacts who invited sender).
`live_visibility` does NOT gate notification delivery — it only gates map visibility.

Deduplication: a second call within 90 seconds of a real send is suppressed and logged with `deduped=true`.

**Auth:** Bearer token required

**Body:** none

**Response:**
```json
{ "ok": true, "recipientCount": number }
// or when deduplicated:
{ "ok": true, "deduplicated": true }
```

Push notifications contain no coordinates. Body: `"<senderName> has activated emergency mode — open Lume to check in."`

---

### Trust

#### `POST /api/trust/request`
Send or upsert a trust request to another user by their `user_id`.

Smart behavior: if the target already has a pending incoming request from me, auto-accepts it and creates the reciprocal row.

**Auth:** Bearer token required

**Body:**
```json
{ "targetUserId": "uuid" }
```

**Response:**
```json
{ "ok": true, "request": { id, requester_user_id, requested_user_id, status, created_at, updated_at } }
// or if auto-accepted:
{ "ok": true, "autoAccepted": true, "accepted": { ... } }
```

---

#### `GET /api/trust/requests/incoming`
List pending trust requests sent to the current user.

**Auth:** Bearer token required

**Response:**
```json
{ "requests": [ { id, requester_user_id, requested_user_id, status, created_at, updated_at } ] }
```

---

#### `POST /api/trust/requests/:id/accept`
Accept an incoming trust request. Creates a reciprocal accepted row automatically.

**Auth:** Bearer token required. Caller must be the `requested_user_id` of the row.

**Response:**
```json
{ "ok": true, "accepted": { id, requester_user_id, requested_user_id, status, updated_at } }
```

---

#### `POST /api/trust/requests/:id/deny`
Deny an incoming trust request.

**Auth:** Bearer token required. Caller must be the `requested_user_id` of the row.

**Response:**
```json
{ "ok": true }
```

---

#### `GET /api/trust/list`
Return accepted trusted contacts for the current user with their profile and visibility setting.

**Auth:** Bearer token required

**Response:**
```json
{
  "contacts": [
    {
      "userId": "uuid",
      "email": "string",
      "displayName": "string | null",
      "shareEnabled": boolean
    }
  ]
}
```

`shareEnabled` = whether the current user has set `can_view=true` for this contact in `live_visibility`. Sorted by displayName then email.

---

### Visibility

#### `POST /api/visibility/set`
Set whether a trusted contact can see you live on the map.

**Auth:** Bearer token required. Trust must be accepted before this can be set.

**Body:**
```json
{ "viewerUserId": "uuid", "canView": boolean }
```

**Response:**
```json
{ "ok": true, "visibility": { owner_user_id, viewer_user_id, can_view, updated_at } }
```

---

### Live Map

#### `GET /api/live/visible`
Return trusted contacts who are currently live and permitted to be seen by the caller.

Filter logic (all three conditions must be met):
1. `live_presence.expires_at > now()`
2. `live_visibility` row where `owner = them, viewer = me, can_view = true`
3. `trusted_contacts` accepted row where `requester = me, requested = them`

**Auth:** Bearer token required

**Response:**
```json
{
  "users": [
    {
      "userId": "uuid",
      "lat": number,
      "lng": number,
      "accuracyM": number | null,
      "mode": "active" | "emergency",
      "updatedAt": "iso",
      "expiresAt": "iso",
      "displayName": "string | null",
      "email": "string | null"
    }
  ]
}
```

---

### History

#### `GET /api/history`
Return the caller's location history, newest first. Defaults to last 24 hours, limit 200.

**Auth:** Bearer token required

**Query params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `from` | ISO date | 24h ago | inclusive |
| `to` | ISO date | now | inclusive |
| `mode` | `active` \| `emergency` | all | optional filter |

**Response:**
```json
{
  "items": [ { id, user_id, lat, lng, accuracy_m, mode, created_at } ],
  "from": "iso",
  "to": "iso",
  "mode": "all" | "active" | "emergency"
}
```

---

### Push Tokens

#### `POST /api/push/register`
Register or refresh an Expo push token for the current user. Safe to call repeatedly (upserts on `user_id + expo_push_token`). Multiple devices per user are supported.

**Auth:** Bearer token required

**Body:**
```json
{ "expoToken": "ExponentPushToken[...]", "platform": "ios" | "android" }
```

**Response:**
```json
{ "ok": true }
```

---

### Shares (In-Memory, V1)

Share state is stored in-memory on the server. Resets on server restart.

#### `POST /api/shares/start`
Register a share token as live.

**Body:**
```json
{ "token": "string", "reason": "string" }
```

#### `POST /api/shares/end`
Mark a share as ended.

**Body:**
```json
{ "token": "string" }
```

#### `POST /api/shares/:token/block`
Block a share token.

---

## Users

#### `POST /api/users/lookup`
Look up a user by email address. Used by the contacts flow to resolve an email to a `userId` before sending a trust request.

**Auth:** Bearer token required

**Body:**
```json
{ "email": "string" }
```

**Response (found):**
```json
{ "exists": true, "userId": "uuid", "displayName": "string | null", "email": "string" }
```

**Response (self):**
```json
{ "exists": true, "isSelf": true, "userId": "uuid", "email": "string" }
```

**Response (not found):**
```json
{ "exists": false }
```

---

## Error Format

All errors follow:
```json
{ "error": "string description" }
```

HTTP status codes: `400` bad input, `401` missing/invalid token, `403` forbidden, `404` not found, `429` rate limited, `500` server error.
