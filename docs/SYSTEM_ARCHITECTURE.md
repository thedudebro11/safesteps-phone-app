Here you go — a **drop-in `docs/SYSTEM_ARCHITECTURE.md`** written in first person, with clear diagrams + contracts + the exact flows you’ve built so far.

Create this file:

`docs/SYSTEM_ARCHITECTURE.md`

Paste this:

```md
# SafeSteps / Lume — System Architecture

This document describes how SafeSteps (Lume) works end-to-end, from the mobile app to the backend and database.

My goal is to keep the system easy to reason about, privacy-first, and stable as features expand.

---

## 1) High-Level Overview

SafeSteps / Lume is a privacy-first GPS safety app built around a strict principle:

**Visibility without surveillance**.

Users are only visible live when they explicitly enable tracking, and they disappear quickly when tracking stops.

The system is made of three main layers:

1. **Mobile app (Expo / React Native)** — collects location, renders the map, manages tracking state
2. **Backend API (Node / Express)** — validates auth, enforces visibility rules, writes presence/history
3. **Supabase (Postgres + Auth)** — stores data and enforces RLS policies

---

## 2) Architecture Diagram

```

┌───────────────────────────┐
│        Mobile App          │
│   Expo + React Native      │
│   - TrackingProvider       │
│   - AuthProvider           │
│   - MapFirstHomeScreen     │
│   - History Screen         │
└──────────────┬────────────┘
│ HTTPS (Bearer JWT)
▼
┌───────────────────────────┐
│        Express API         │
│   Node.js + Express        │
│   - requireUser middleware │
│   - /api/locations         │
│   - /api/emergency         │
│   - /api/live/visible      │
│   - /api/presence/stop     │
│   - /api/history           │
│   - /api/trust/*           │
│   - /api/visibility/*      │
└──────────────┬────────────┘
│ Supabase Admin + Queries
▼
┌───────────────────────────┐
│          Supabase          │
│ Postgres + Auth + RLS      │
│ Tables:                    │
│ - live_presence            │
│ - location_history         │
│ - trusted_contacts         │
│ - live_visibility          │
│ - profiles                 │
└───────────────────────────┘

```

---

## 3) Mobile App Modules

### 3.1 AuthProvider
- Manages Supabase auth session + token lifecycle
- Exposes current user + access token to the app
- Ensures all protected server routes use:
  `Authorization: Bearer <access_token>`

### 3.2 TrackingProvider
Tracking state machine:

```

idle → active → idle
idle → emergency → idle
active → emergency → idle

```

Responsibilities:
- Requests location permission
- Gets location fixes via `expo-location`
- Sends pings to the server
- Stops pings + clears presence when tracking ends

### 3.3 MapFirstHomeScreen (map-first UI)
Responsibilities:
- Renders the map + user dot
- Polls visible trusted users via `/api/live/visible`
- Shows markers for trusted contacts who are currently live
- Uses boosted polling for near real-time presence without websockets

### 3.4 History Screen
Responsibilities:
- Fetches location history via `/api/history`
- Uses silent auto refresh to avoid UI blinking
- Renders newest-first event feed

---

## 4) Backend API Layer

The backend exists for one reason:

**Enforce privacy + permission rules server-side**.

The client can never be trusted to enforce who can see what.

### 4.1 Authentication enforcement
All protected routes go through:

- `requireUser` middleware
- Validates Supabase JWT
- Sets `req.userId`

If `REQUIRE_AUTH=true`, requests must include a valid Bearer token.

---

## 5) Database Model

### 5.1 live_presence (ephemeral)
Purpose:
- Represents live location when tracking is enabled
- Must disappear quickly when tracking stops

Key fields:

- `user_id` (unique)
- `lat`, `lng`
- `mode` (`active` | `emergency`)
- `expires_at`

Presence lifecycle:

- Upsert on every ping
- `expires_at = now + 90 seconds`
- Deleted immediately on `/api/presence/stop`

---

### 5.2 location_history (append-only events)
Purpose:
- Records past pings (optional UI feature, but very useful)
- Never mutated

Key fields:

- `id`
- `user_id`
- `lat`, `lng`, `accuracy_m`
- `mode`
- `created_at`

---

### 5.3 trusted_contacts
Purpose:
- Defines who I trust / have a relationship with

Key fields:

- `requester_user_id`
- `requested_user_id`
- `status` (`pending` | `accepted` | `denied`)

Accepted trust becomes reciprocal (two directional accepted rows).

---

### 5.4 live_visibility (directional permission)
Purpose:
- Controls visibility on the map
- Owner decides whether viewer can see them

Key fields:

- `owner_user_id`
- `viewer_user_id`
- `can_view` boolean

Meaning:
- If owner sets `can_view=false`, viewer will not see them live even if trust exists.

---

### 5.5 profiles
Purpose:
- Attach identity to user markers and contact list

Fields used:
- `user_id`
- `email`
- `display_name`

---

## 6) Core Data Flows

### 6.1 Active Tracking Ping

```

TrackingProvider
└─ POST /api/locations { lat, lng, accuracyM, mode:"active" }
├─ requireUser → userId
├─ upsert live_presence (expires_at now+90s)
└─ insert location_history (append-only)

```

Result:
- User becomes visible live (if visibility + trust allow it)

---

### 6.2 Emergency Ping

```

TrackingProvider
└─ POST /api/emergency { lat, lng, accuracyM, mode:"emergency" }
├─ requireUser → userId
├─ upsert live_presence mode=emergency (expires_at now+90s)
└─ insert location_history mode=emergency

```

Result:
- User is visible live as EMERGENCY

---

### 6.3 Stop Tracking (instant disappearance)

```

TrackingProvider stopAll()
└─ POST /api/presence/stop
├─ requireUser → userId
└─ delete live_presence where user_id = userId

```

Result:
- User disappears immediately from other maps

---

### 6.4 Live Visibility Query

```

MapFirstHomeScreen polling loop
└─ GET /api/live/visible
├─ requireUser → viewerId
├─ query live_presence where expires_at > now()
├─ join live_visibility where owner allows viewer
├─ join trusted_contacts where accepted
└─ attach profiles (display_name/email)

```

Result:
- Viewer receives only trusted + permitted live users

---

### 6.5 History Query

```

History screen
└─ GET /api/history?from=&to=&mode=
├─ requireUser → userId
└─ returns newest-first pings

```

History refresh behavior:
- Auto-refresh while focused (silent)
- Manual refresh triggers non-silent reload

---

## 7) Polling + Near Real-Time Strategy

I intentionally avoided websockets for V1.

Instead, I use a hybrid polling strategy:

- Normal polling: every 5 seconds
- Boost window polling: every 1 second for 12 seconds after:
  - tracking starts
  - visible user count changes

This makes visibility feel near real-time without the complexity of realtime subscriptions.

---

## 8) Design Principles

The system is guided by these principles:

- Presence is ephemeral
- History is append-only
- The server enforces permissions
- Emergency overrides everything
- Polling should be state-aware
- Background refresh must be silent
- Privacy is the top priority

See: `docs/ENGINEERING_INVARIANTS.md`

---

## 9) Next planned upgrades

- Push notifications for emergency mode
- Shareable safety sessions (time-limited live sharing)
- Background tracking (expo-task-manager)
- Optional: Supabase realtime presence (only if it preserves strict permission enforcement)
```

