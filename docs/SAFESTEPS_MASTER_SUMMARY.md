# SafeSteps – Master Summary

## 1. Vision

SafeSteps is a **privacy-first personal safety app** that lets people:

- Share their live location **only when they choose**
- Trigger an **Emergency Mode** that sends clearly labeled emergency pings
- Optionally share a **live location link** with trusted contacts (even if they don’t install the app)
- Build **circles of trust** (family/friends) that can see each other on a map when tracking is enabled

Core principles:

1. **Privacy-first** – No analytics, no ad tracking, no silent background spying.
2. **User control** – User explicitly turns tracking on/off and controls who sees what.
3. **Transparency** – Clear UI showing when location is being used and why.
4. **Safety over surveillance** – Tool for emergencies and peace of mind, not for controlling people.

---

## 2. Current Status (Pre-v1)

**Environment**

- Mobile app: Expo + React Native + Expo Router (TypeScript)
- Backend: Planned Node.js + Express server
- Data: Supabase (Auth + Postgres + RLS)

**Implemented so far**

- ✅ Project structure with Expo Router
- ✅ Tab navigation:
  - `Home`
  - `Contacts`
  - `History`
  - `Settings`
- ✅ Auth stack:
  - `(auth)/login`
  - `(auth)/register`
- ✅ Supabase Auth:
  - Email/password sign up & login
  - Session persistence via SecureStore on native
  - In-memory session for web
- ✅ `AuthProvider` + `useAuth` hook:
  - `user`, `session`
  - `guestMode` (guest session support)
  - Derived flags: `isGuest`, `isAuthenticated`, `hasSession`
  - `signInWithEmail`, `signUpWithEmail`, `signOut`
  - `isAuthActionLoading`
- ✅ Route protection (global):
  - Root `app/_layout.tsx` uses `hasSession` to decide:
    - No session → `(auth)` group (login/register)
    - Guest or authenticated session → `(tabs)` group (main app)
  - Also forces URL:
    - No session → `/login`
    - Has session → `/home`
- ✅ Guest Mode:
  - “Continue as Guest” on login screen
  - Guest session uses local-only mode (no backend yet)
  - Settings shows guest status and “Exit Guest Mode”
- ✅ Settings screen:
  - Shows signed-in email **or** guest session label
  - Logout / Exit Guest Mode uses signOut() + router.replace("/login") to return to the auth flow on all platforms

### 🔜 Next Priority Work
1) Home screen:
- Welcome card (email/guest)
- Active Tracking toggle + frequency
- Emergency Mode control (override logic)

2) Location capture pipeline:
- Foreground GPS capture
- State machine + timer safety

3) Backend + DB:
- Persist pings
- Read history

4) Sharing (Option B, v1):
- Recipient-specific share links
- Explicit expiration
- On/off state
- Share viewer route
- Token hashing + rate limiting

## 3. Architecture Overview

### 3.1 Frontend (Expo App)

- **Framework**: Expo + React Native + Expo Router
- **Language**: TypeScript
- **Navigation**:
  - Root layout: `app/_layout.tsx`
    - Wraps app in `AuthProvider`
    - Uses `hasSession` (from `useAuth`) to route:
      - No session → `(auth)` with `/login`
      - Guest or user → `(tabs)` with `/home`
  - Auth group: `app/(auth)/…`
    - `login.tsx`
    - `register.tsx`
  - Tabs group: `app/(tabs)/…`
    - `home.tsx`
    - `contacts.tsx`
    - `history.tsx`
    - `settings.tsx`
- **State / Auth**:
  - `AuthProvider` wraps the whole app
  - Uses Supabase client + SecureStore
  - Tracks:
    - Supabase `user` and `session`
    - `guestMode` flag for guest sessions
    - Derived flags: `isGuest`, `isAuthenticated`, `hasSession`
  - Exposes auth actions:
    - `signInWithEmail`
    - `signUpWithEmail`
    - `signOut`
    - `startGuestSession` / `endGuestSession`

### 3.2 Backend (planned)

- **Node.js + Express** server
- TypeScript
- Talks to Supabase using:
  - Service role key (server-only)
  - Supabase JS client or `pg`
- Responsibilities:
  - Verify Supabase JWT in `Authorization: Bearer <token>`
  - Insert and fetch `location_pings`
  - Manage `trusted_contacts`
  - Generate and validate **shareable live location links**
  - Future: trigger notifications (email/SMS)

### 3.3 Database (Supabase / Postgres)

Planned tables:

- `trusted_contacts`
- `location_pings`
- Future: `share_links` (for link-based live location sharing)

RLS enforced:

- Users can only read/write rows where `user_id = auth.uid()`.

---

## 4. Core Features (v1 Scope)

**v1 MUST-HAVES**

1. Auth:
   - Email/password login & register
   - Logout
   - **Guest mode**:
     - Continue as Guest (local-only usage)
     - Upgrade path to account later
2. Home:
   - Centered map with blue dot (user location)
   - Status: Off / Active Tracking / Emergency Mode
   - Buttons:
     - Start/Stop Active Tracking
     - Activate/Stop Emergency Mode
     - “Share my live location” (generates link)
3. Contacts:
   - Add, list, delete trusted contacts
   - Flag “receives emergency alerts”
4. History:
   - List of pings:
     - Time
     - Lat/lng
     - Type (normal/emergency)
   - Emergency pings visually highlighted
5. Settings:
   - Signed-in email **or** guest session label
   - Logout / Exit Guest Mode
   - Data & Safety text

**Non-goals for v1**

- Full-blown background tracking (optional/experimental only)
- Push notifications
- Family map with multiple users in real-time (v2+)
- Advanced analytics, admin dashboards, etc.

---

## 5. Privacy & Security Model

- No third-party analytics SDKs.
- No ad networks.
- Location only used when:
  - Active Tracking or Emergency Mode is ON, or
  - User explicitly triggers a one-time action (e.g., share link).
- Location data stored:
  - In `location_pings` table scoped to `user_id`.
- Users explicitly control:
  - When tracking is ON vs OFF.
  - Who is a trusted contact.
  - Whether they share a link.

---

## 6. Design Language

Colors:

- Background: `#050814`
- Card background: `#0c1020`
- Border: `#1a2035`
- Accent (primary): `#3896ff`
- Muted text: `#a6b1cc`
- Danger: `#ff4b5c`

Aesthetic:

- Dark, minimal, safety-tech
- Rounded cards (14–18px radius)
- Clean typography, high contrast
- Clear, bold emergency elements (red and prominent)

See `docs/DESIGN_GUIDE.md` for full design spec.

---

## 7. Current Step & Next Milestones

**Current step:**

- Guest mode + route protection implemented.
- Working login/register + logout/exit guest in Settings.
- Next focus: **Home screen UX** for solo user and guest vs signed-in states.

**Next milestones:**

1. Build Home screen:
   - “Welcome, {email}” (or “Welcome, Guest”)
   - Tracking mode status card (stub)
   - Buttons to navigate toward future tracking/emergency flows
2. Design DB schema in Supabase for `trusted_contacts` and `location_pings`.
3. Build Express backend and wire first API endpoints.
4. Decide local-only vs cloud-backed behavior differences for guest vs authenticated users.

---

## 8. How to Use This Document

- This file is the **single source of truth** about:
  - What SafeSteps is
  - What exists today
  - What’s coming next
- Update this whenever:
  - Architecture changes
  - Major features land
  - Versions (v1, v2, etc.) shift

This doc is your **project brain** that any AI (or human dev) can load to understand SafeSteps quickly.
