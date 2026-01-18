Below is a **single, updated “source of truth” master spec** for SafeSteps V1 that matches the **latest UI/UX you locked in** (Home + Contacts + Shares + History + Settings), along with **philosophy, tiers, security model, app structure, and build order**.

You can paste this directly into `SAFESTEPS_MASTER_SUMMARY.MD` and then split pieces into supporting docs.

---

# SafeSteps — Master Summary (V1 Scope, UX/UI Locked)

## 1. Vision

SafeSteps is a **privacy-first, consent-driven safety tool** for location sharing.

It is **not** a background surveillance tracker.

Users can:

* See their **current location** and signal quality
* Enable **Active Tracking** (auto pings at a chosen interval)
* Trigger **Emergency Mode** (high-frequency, clearly-labeled emergency pings)
* Share a **live location link** with trusted contacts (recipient-specific sessions)
* Review **Location History** with clear context and navigation actions

### Core Principles

1. **Explicit consent** — Location sharing starts only when the user initiates it.
2. **No silent tracking** — No hidden background tracking by default.
3. **Honest state** — Clear UI states (Active, Spotty, Dead signal; Emergency) with no misleading “smoothness.”
4. **Safety without control** — Designed to reduce uncertainty, not enable surveillance or coercion.
5. **Minimal data** — Collect only what’s needed; store as little as possible, for as short as possible.

---

## 2. Product Philosophy (Non-Negotiable)

### “Session-Based Trust”

All location sharing is **session-based**:

* Explicit start
* Explicit stop
* Explicit expiration
* Explicit recipients (tier-dependent)
* Tokens are **per-recipient** and **revocable**

No silent extensions. No “always-on live” illusion.

### “State is Derived, Not Claimed”

The UI shows truth derived from signals:

* **Signal Accuracy: Active** → GPS + network healthy, last ping successfully sent recently
* **Spotty** → degraded GPS or degraded network (pings may be delayed)
* **Dead** → no reliable GPS/network; cannot confirm delivery

---

## 3. User Tiers (Locked)

SafeSteps has three tiers. The key idea: **Guests can try the product meaningfully**, accounts provide **durability and control**, paid provides **scale**.

### 3.1 Guest

Guest is **local-only** and limited for safety/abuse reasons.

Guest can:

* Use app immediately
* See map + lat/lng + accuracy
* Manual pings (local history)
* Limited auto tracking options (bounded)
* Add **1 trusted contact**
* Run **1 active share session** (ephemeral, limited duration)
* View honest states (Active/Spotty/Dead)

Guest cannot:

* Emergency mode
* Multiple contacts or multiple active shares
* Long-duration links
* Cloud history restore after reinstall
* Advanced rate/frequency customization

### 3.2 Free Account

Free account enables **identity-backed trust**:

* Multiple trusted contacts (e.g., up to 3)
* Cloud-backed short history window (e.g., 24 hours)
* More sharing durability and controls
* Lower frequency presets than guest

### 3.3 Paid Account

Paid unlocks **scale and flexibility**, not truth:

* More trusted contacts (10+)
* Multiple active shares
* Longer share durations (24h+)
* Extended history (7–30 days)
* Lower minimum interval (e.g., 15s)
* (Optional) custom interval input clamped safely

---

## 4. UI/UX — Final Navigation & Screen Responsibilities

### Bottom Navigation (Locked)

Tabs:

* **Home**
* **Contacts**
* **Shares**
* **History**
* **Settings**

No history or active-share management on Home.

---

## 5. Screen UX Contracts (What Each Screen Does)

## 5.1 Home (Real-time “Now”)

**Home = tracking + map only.**
This screen answers: **“Where am I right now, and is the app working?”**

### Home Contains

* **Tracking Card**

  * Status: OFF / ACTIVE / EMERGENCY
  * Frequency selector (tier-based options)
  * Primary actions:

    * Start/Stop Active Tracking
    * Emergency (account-only; prominent red)
    * **Share Live Location** (renamed from “Ping Now”)
* **Signal Accuracy indicator**

  * Active / Spotty / Dead
  * Must reflect actual ability to send pings
* **Coordinates + accuracy**

  * Lat/Lng
  * Accuracy meters (e.g., 5m)
  * “Last updated X sec ago”
* **Map**

  * Blue location dot + accuracy circle
  * No historical pins on Home (Home is present tense)

### Share Live Location (Home)

Tapping **Share Live Location** does **not** immediately share.
It navigates to **Contacts** to pick a recipient and start a session.

---

## 5.2 Contacts (Recipient Selection + Manage Trusted Contacts)

**Contacts = trusted people list + start a share per contact.**
This screen answers: **“Who can I share with?”**

### Contacts Contains

* Search input
* Trusted contact list rows:

  * Name
  * Phone
  * Optional email
  * Action button:

    * **Share Location Link**
* Row state if already shared:

  * “SHARING” indicator (green dot/pill)
  * Button changes state (disabled or becomes “Manage/Revoke”)

### Contact Selection Share Flow

1. User taps **Share Location Link** on a contact row
2. App creates/activates a **recipient-specific share session**
3. UI updates contact row to show **SHARING**
4. Link is available in Shares screen (manage/copy/revoke)

---

## 5.3 Shares (Active Share Sessions Management)

**Shares = active sessions + control.**
This screen answers: **“Who is seeing me right now?”**

### Shares Contains

* Search input
* Active Shares list:

  * Contact name + phone/email
  * Status pill: LIVE / STALE (derived)
  * Time remaining (expiration countdown)
  * “Manage” action
* **+ New Share** button (valid entry point)

### Allowed Entry Points

Creating a share is allowed from:

* Home (via “Share Live Location” → Contacts)
* Shares (via “+ New Share” → Contacts)

Both must funnel into **the same share creation flow**.

---

## 5.4 History (Location History + Action Buttons)

**History = logs + inspect + directions.**
This screen answers: **“What happened before, and where was it?”**

Each history entry includes:

* **Time**
* **Place name** (reverse geocode)
* Address (if available)
* Ping type:

  * **User Ping** (self)
  * **Trusted Contact Ping** (includes contact name)
  * Emergency pings clearly labeled and styled red
* Per-entry actions:

  * **Location Ping** → focuses map UI on that ping location, shows marker & accuracy
  * **Directions** → opens system share sheet / app chooser for navigation apps (Google Maps, Apple Maps, Waze, etc.)

History view includes:

* List + small embedded map preview area
* Filter/search
* “Recent / All History” tabs (optional)

---

## 5.5 Settings (Account, Preferences, Trust)

**Settings = account & privacy clarity.**
This screen answers: **“What is SafeSteps doing and what is my account state?”**

### Settings Contains

* Account section
* Location Settings (preferences only, no ping actions)
* Notifications (future-ready; may be minimal in V1)
* Subscription (paid plan management)
* Help & Support
* Log Out button
* Privacy Policy + Terms + app version

Guest mode variant:

* Shows “Guest session (local only)”
* “Exit Guest Mode” instead of Log Out

---

## 6. Core Features (V1)

### 6.1 Tracking Modes (One timer at a time)

Modes:

* Idle (OFF)
* Active Tracking (preset interval)
* Emergency Mode (override + red labeling)

Rules:

* **No duplicate timers**
* Emergency overrides Active Tracking if active
* Pings occur only when:

  * user taps actions OR
  * Active Tracking is ON OR
  * Emergency is ON

### 6.2 Emergency Mode (V1 Definition)

Emergency is basically “live share to everyone,” but implemented as its own mode/session:

* Sends pings labeled **EMERGENCY**
* Visually red in UI
* Recipients = **all trusted contacts** (account-only)
* Frequency fixed per tier (e.g., Free: 30s, Paid: 15s)
* Stop is deliberate (confirm or press-and-hold) to prevent accidental shutdown

---

## 7. Sharing Model (V1 Signature)

### Share Sessions (unit of trust)

A share session has:

* start time
* expiration time
* state: active/paused/revoked/expired
* recipient relationship
* token (per recipient)
* ability to revoke instantly

### Share Links (Recipient-specific)

* Each trusted contact receives a link
* Link opens a web viewer (no app install required)
* Viewer sees:

  * Map dot + accuracy circle
  * LIVE/STALE/OFFLINE state
  * “Last updated X ago”
  * Expiration timer
  * “Open in Maps” action
  * Recipient controls: stop receiving / block sender (future if implemented)

---

## 8. Security & Privacy Model (Zero-Trust)

### 8.1 Data Minimization

* No third-party analytics SDKs
* No ad networks
* No selling location data
* Collect only:

  * location pings required for the feature
  * recipient-specific session metadata

### 8.2 Authentication & Authorization

* Supabase Auth (email/password)
* RLS everywhere:

  * users can only read/write rows where `user_id = auth.uid()`
* JWT required for authenticated API calls

### 8.3 Share Link Security

* Tokens are random, high-entropy
* Store token hashes in DB (not raw tokens)
* Revoke = immediate invalidation
* Expired sessions cannot be resumed silently

### 8.4 Abuse Prevention (V1-ready, can be expanded)

* Rate-limit share creation per user/device
* Clamp ping intervals by tier
* Guest limits enforced server-side when guest sharing exists
* (Optional later) recipient block list keyed to hashed recipient identifier

---

## 9. Architecture (V1 Implementation Path)

### Recommended V1 Approach

**Supabase-first**:

* Supabase Auth
* Postgres tables + RLS
* Minimal server (optional)
* Add Edge Functions / Express only when needed for:

  * rate limiting / abuse heuristics
  * secure token issuance
  * web viewer aggregation
  * notifications later

### Frontend

* Expo + React Native + Expo Router
* TypeScript
* `AuthProvider` manages:

  * session
  * guest mode
  * derived flags
* Tab group includes:

  * Home / Contacts / Shares / History / Settings

### Backend (Optional in V1)

If used:

* Validates Supabase JWT
* Issues share sessions/tokens
* Serves history pages for viewer

---

## 10. Database (Supabase / Postgres, V1 Tables)

Planned core tables:

* `trusted_contacts`
* `location_pings`
* `share_sessions`
* `share_recipients` (or `share_tokens`)

Key column concepts:

* `location_pings.mode` = `normal | emergency`
* `location_pings.source` = `user | share`
* `location_pings.shared_to_contact_id` (nullable)
* `share_sessions.status` = `active | paused | revoked | expired`
* `share_sessions.expires_at`

All user-owned rows scoped by `user_id` with RLS.

---

## 11. Design Language (Locked)

Colors:

* Background: `#050814`
* Card: `#0c1020`
* Border: `#1a2035`
* Accent: `#3896ff`
* Muted text: `#a6b1cc`
* Danger: `#ff4b5c`

Aesthetic:

* Dark, minimal, safety-tech
* Rounded cards
* Low-noise typography
* Emergency is always visually distinct (red)

---

## 12. V1 Definition of Done

V1 is complete when:

* Home shows map + tracking + signal truth
* Active Tracking works reliably (single timer)
* Emergency Mode works reliably (clearly labeled, sent to all contacts)
* Contacts supports adding/managing contacts and starting share links
* Shares supports managing active share sessions
* History shows pings with:

  * time, place, type, contact (if shared)
  * “Location Ping” + “Directions” actions
* Settings correctly represents account/guest state and logout behavior
* RLS and token security are enforced
* Failure states are honest and visible (no silent success)

---

## 13. Build Order (Fastest Path to Ship V1)

1. **Finalize DB schema + RLS** (contacts, pings, share sessions/tokens)
2. Implement **tracking provider** (single timer, mode overrides)
3. Implement **Home** wiring (signal state + location + actions)
4. Implement **Contacts → Share Location Link flow**
5. Implement **Shares management** (list/revoke/expiration)
6. Implement **History** with “Location Ping” + “Directions”
7. Hardening:

   * rate limits
   * interval clamps
   * error handling & UI honesty polish

---

## 14. What SafeSteps Is Not (V1 Non-Goals)

* No always-on background tracking
* No danger detection / kidnapping detection
* No push notifications required for V1
* No full family “always visible” map (v2+)
* No analytics/telemetry
* No dark-pattern upsells

---

If you want, I can also generate a **diff-style “What changed vs your current master summary”** so you can update the other docs faster (DESIGN_GUIDE, SECURITY_MODEL, DB_SCHEMA, etc.) without missing anything.


## Auth Modes (Supabase + Guest)

SafeSteps supports two modes:

### 1) Authenticated (Supabase)
- `user` exists
- `session` exists (access_token available)
- `isAuthenticated = true`
- `hasSession = true`

### 2) Guest Mode (local-first)
- No Supabase user
- `guestMode = true`
- `isGuest = guestMode && !user`
- `hasSession = isGuest || isAuthenticated`
- Guest state is persisted using a "guest flag" so guest survives reloads.

### Key Rule
**Never let Supabase SIGNED_OUT events automatically disable guest mode.**
Supabase auth events can fire during transitions (especially when starting guest mode and calling `supabase.auth.signOut()`), so guest state must be treated as independent and higher-priority during guest start.

### Guest Persistence
Guest mode uses a shared key:
- `GUEST_FLAG_KEY = "safesteps_guest"`
- Web: `localStorage`
- Native: `AsyncStorage`

Guest is restored on app start if:
- No Supabase user session exists AND guest flag is set.

UI + Tracking Synchronization Update (Live Map & Scrolling Fix)

Summary
Added a shared “Live Map” component across Home and Shares, exposed lastFix from TrackingProvider, and fixed mobile scrolling issues caused by native map gesture interception.

Key changes

Introduced src/features/map/:

SharedMap.native.tsx (react-native-maps)

SharedMap.web.tsx (react-leaflet + OSM)

LiveMapCard.tsx (shared card UI)

Map displays last known device location, not recipient locations (by design for V1).

Share state (“Sharing with…”, emergency badge) is derived from client state only.

TrackingProvider

Added lastFix to tracking state.

lastFix updates on every GPS fix even if network ping fails.

Ensures UI (map, accuracy) remains truthful during offline / network errors.

Tracking → idle transition enforces invariant:

active → idle ⇒ zero live shares.

Scrolling fix (critical mobile behavior)

Native maps intercept touch gestures and break ScrollView scrolling.

Solution:

Disable map interaction entirely for V1.

Apply pointerEvents="none" on the map wrapper.

Explicitly disable map gestures (scrollEnabled, zoomEnabled, etc.).

Result:

Scroll works reliably on Home, Shares, and future screens.

Map is display-only (correct for V1).

Layout consistency

All tab screens now use a single scroll container (ScrollView).

Spacing standardized using gap on container styles.

Shares screen spacing now matches Home screen card rhythm.

Why this matters

Prevents UI drift between tabs.

Keeps tracking + sharing logic authoritative in the client.

Avoids gesture bugs that only appear on real devices.

Sets a stable foundation for future multi-recipient map views.

Design invariant (V1)

SafeSteps must never resume tracking automatically after a restart.

Therefore:

Live shares cannot survive a cold boot if tracking is idle

Ending stale shares is preferred over silently restarting tracking

This preserves:

User consent

Truthful UI

Privacy-first behavior