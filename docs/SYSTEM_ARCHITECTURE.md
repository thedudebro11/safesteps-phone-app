# SafeSteps / Lume — System Architecture

_Last updated: 2026-05-12_

This document describes how SafeSteps works end-to-end, from the mobile app to the backend and database.

---

## 1. High-Level Overview

SafeSteps is a privacy-first GPS safety app built around one principle:

**Visibility without surveillance.**

Users are only visible live when they explicitly enable tracking, and they disappear quickly when tracking stops.

Three main layers:

1. **Mobile app (Expo / React Native)** — collects location, renders the map, manages tracking state
2. **Backend API (Node / Express on Railway)** — validates auth, enforces visibility rules, writes presence/history
3. **Supabase (Postgres + Auth)** — stores data, enforces RLS policies

---

## 2. Architecture Diagram

```
┌───────────────────────────┐
│        Mobile App          │
│   Expo + React Native      │
│   - AuthProvider           │
│   - TrackingProvider       │
│   - SharesProvider         │
│   - ContactsProvider       │
│   - MapFirstHomeScreen     │
│   - History Screen         │
└──────────────┬────────────┘
               │ HTTPS (Bearer JWT)
               ▼
┌───────────────────────────┐
│        Express API         │
│   Node.js on Railway       │
│   - requireUser middleware │
│   - /api/locations         │
│   - /api/emergency         │
│   - /api/emergency/alert   │
│   - /api/presence/stop     │
│   - /api/history           │
│   - /api/trust/*           │
│   - /api/visibility/set    │
│   - /api/live/visible      │
│   - /api/push/register     │
│   - /api/shares/*          │
└──────────────┬────────────┘
               │ Supabase Admin + Queries
               ▼
┌───────────────────────────┐
│          Supabase          │
│  Postgres + Auth + RLS     │
│  Tables:                   │
│  - profiles                │
│  - trusted_contacts        │
│  - live_presence           │
│  - live_visibility         │
│  - location_history        │
│  - push_tokens             │
│  - emergency_alerts        │
└───────────────────────────┘
```

---

## 3. Mobile App Modules

### 3.1 AuthProvider (`src/features/auth/AuthProvider.tsx`)
- Manages Supabase auth session + token lifecycle
- Upserts `profiles` row on every session load
- Registers Expo push token once per distinct user on login
- Exposes `isAuthenticated`, `user`, `session`, `isAuthActionLoading`
- All protected server routes use: `Authorization: Bearer <access_token>`

### 3.2 TrackingProvider (`src/features/tracking/TrackingProvider.tsx`)
Tracking state machine:
```
idle → active → idle
idle → emergency → idle
active → emergency → idle
```
- Requests location permission
- Gets location fixes via `expo-location`
- Sends pings to `/api/locations` (active) or `/api/emergency` (emergency)
- Calls `/api/presence/stop` when tracking ends
- Stopping active tracking ends all live shares (`SharesProvider.endAllLiveShares()`)

### 3.3 SharesProvider (`src/features/shares/SharesProvider.tsx`)
- Manages share session lifecycle
- Syncs with server via `/api/shares/start` and `/api/shares/end`
- Emergency shares (`reason: "emergency"`) are ended when emergency tracking stops

### 3.4 ContactsProvider (`src/features/contacts/ContactsProvider.tsx`)
- Manages local contact state
- Backed by server trust system (`/api/trust/*`)

### 3.5 MapFirstHomeScreen (native / web variants)
- Renders a **dark navy custom-styled Google Maps** (24-rule style JSON matching `#050814` theme)
- Polls `/api/live/visible` on an interval for trusted contacts who are live
- Boost polling: 1s intervals for 12 seconds after tracking starts or visible count changes
- Trusted contacts rendered as **custom `ContactMarker` components** — 44px circle with colored border (green = live, red = emergency), profile photo or initials fallback, name label, tap-to-directions callout
- `tracksViewChanges={isEmergency}` on markers — prevents frame-by-frame re-renders except during emergency pulse animation

### 3.6 History Screen
- Fetches from `/api/history`
- Silent auto-refresh while focused (no loading flicker)
- Newest-first event feed

---

## 4. Backend API

The backend enforces privacy and permission rules server-side. The client cannot be trusted to decide what it can see.

### 4.1 Authentication
All protected routes use `requireUser` middleware (`server/middleware/requireUser.js`):
- Validates Supabase JWT via `supabaseAuth.auth.getUser(token)`
- Sets `req.userId`

### 4.2 Route Modules
| Module | File | Handles |
|---|---|---|
| Locations | `server/index.js` | `/api/locations`, `/api/emergency`, `/api/presence/stop` |
| Trust | `server/routes/trust.js` | `/api/trust/*` |
| Visibility | `server/routes/visibility.js` | `/api/visibility/set` |
| Live | `server/routes/live.js` | `/api/live/visible` — single RPC call via `get_visible_users()` |
| History | `server/routes/history.js` | `/api/history` |
| Push | `server/routes/push.js` | `/api/push/register` |
| Emergency alerts | `server/routes/emergency.js` | `/api/emergency/alert` |
| Shares | `server/routes/shares.js` | `/api/shares/*` (DB-backed, SHA-256 token hashing) |
| Users | `server/routes/users.js` | `/api/users/lookup`, `/api/users/profile` |

### 4.3 Database Layer
- **Connection pooling**: PgBouncer enabled (Supabase dashboard) — warm pool of 15 Postgres connections shared across all requests, eliminates per-request connection overhead
- **Validation**: All routes use Zod `validate()` middleware (`server/lib/validate.js`)
- **Performance**: `/api/live/visible` uses `get_visible_users()` Postgres RPC — 4 queries collapsed to 1 JOIN, ~4x faster under load

---

## 5. Core Data Flows

### 5.1 Active Tracking Ping
```
TrackingProvider
└─ POST /api/locations { lat, lng, accuracyM }
   ├─ requireUser → userId
   ├─ upsert live_presence (mode=active, expires_at=now+90s)
   └─ insert location_history (mode=active, append-only)
```

### 5.2 Emergency Ping
```
TrackingProvider
└─ POST /api/emergency { lat, lng, accuracyM }
   ├─ requireUser → userId
   ├─ upsert live_presence (mode=emergency, expires_at=now+90s)
   └─ insert location_history (mode=emergency, append-only)
```

### 5.3 Emergency Alert (push notifications)
```
Client triggers emergency
└─ POST /api/emergency/alert
   ├─ requireUser → senderId
   ├─ dedup check (emergency_alerts, 90s window)
   ├─ resolve trusted contacts (both trust directions)
   ├─ fetch push_tokens for recipients
   ├─ send via Expo Push API (chunked, max 100/request)
   └─ insert emergency_alerts record
```

### 5.4 Stop Tracking
```
TrackingProvider stopAll()
└─ POST /api/presence/stop
   ├─ requireUser → userId
   └─ delete live_presence where user_id = userId
```
User disappears from all other maps within the next poll cycle.

### 5.5 Live Visibility Query
```
MapFirstHomeScreen polling loop
└─ GET /api/live/visible
   ├─ requireUser → viewerId
   ├─ live_presence where expires_at > now()
   ├─ live_visibility where owner allows viewer (can_view=true)
   ├─ trusted_contacts where accepted (requester=viewer, requested=owner)
   └─ attach profiles (display_name, email)
```

### 5.6 History Query
```
History screen
└─ GET /api/history?from=&to=&mode=
   ├─ requireUser → userId
   └─ location_history newest-first, limit 200
```

---

## 6. Polling Strategy

WebSockets are intentionally avoided in V1.

Hybrid polling on `/api/live/visible`:
- **Base interval:** 5 seconds
- **Boost window:** 12 seconds at 1-second intervals, triggered when:
  - Tracking turns ON
  - Visible user count changes
- `inFlightRef` guard prevents overlapping requests
- Polling disabled when user is not authenticated or tracking is idle

---

## 7. Design Principles

- **Presence is ephemeral** — expires in 90s, deleted instantly on stop
- **History is append-only** — never mutated
- **Server enforces permissions** — client never decides visibility
- **Emergency overrides everything** — highest priority mode
- **Polling is state-aware** — no unnecessary requests
- **Background refresh is silent** — no loading spinners on auto-refresh
- **Privacy first** — no analytics SDKs, no silent tracking

See: `docs/ENGINEERING_INVARIANTS.md`

---

## 8. Planned Upgrades

- Guest mode (see `docs/AUTH_FLOW.md` Part 2 for full spec)
- DB-backed share sessions (replace in-memory Map)
- Persistent rate limiting (replace in-memory map with Redis/DB)
- Supabase Realtime as an optional drop-in (only if strict permission enforcement is preserved)
