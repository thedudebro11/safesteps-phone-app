# SafeSteps – Roadmap



## Stage 0 – Foundation (IN PROGRESS)

- [x] Expo + React Native + Expo Router setup
- [x] Tab navigation (Home, Contacts, History, Settings)
- [x] Auth screens (login, register)
- [x] Supabase client, env setup
- [x] AuthProvider with session persistence
- [x] Logout from Settings
- [ ] Route protection (auth vs tabs)
- [ ] Home “Welcome, {email}” card

---

## Stage 1 – v1 Core (MVP)

**Goal:** SafeSteps is usable for a **single user** as a safety tool.

### 1.1 Home (Single User UX)

- [ ] Map with user’s blue dot
- [ ] Live Tracking toggle
  - [ ] State: Off / Active
  - [ ] Interval selection (e.g., 30s, 60s, 120s)
- [ ] Emergency Mode button
  - [ ] Toggles emergency state
  - [ ] Faster pings (e.g., every 5–10s)

### 1.2 Tracking & Pings

- [ ] Supabase `location_pings` table
- [ ] Express `/api/locations` endpoint
- [ ] Express `/api/history` endpoint
- [ ] Client tracking loop for Active Tracking
- [ ] Client tracking loop for Emergency Mode

### 1.3 Trusted Contacts (Basic)

- [ ] Supabase `trusted_contacts` table
- [ ] Express `/api/contacts` (list/add/delete)
- [ ] Contacts screen UI
- [ ] Empty state for single user

### 1.4 History

- [ ] Fetch location history from `/api/history`
- [ ] List view with normal vs emergency pings
- [ ] Clear visual highlight for emergency events

### 1.5 Privacy & Settings

- [ ] Settings copy explaining:
  - No “always-on” requirement
  - No silent tracking
  - No third-party analytics
- [ ] Optional: toggle for “Allow background tracking” (tech exploration)

---

## Stage 2 – v1.1+ (Enhancements)

- [ ] Live location share links:
  - [ ] `share_links` table
  - [ ] `POST /api/share-links` → create link
  - [ ] `GET /s/:token` → read-only last known location
- [ ] Improved map experience:
  - [ ] Last known location marker in History
  - [ ] Tap ping → view on map
- [ ] Basic battery/performance tuning

---

## Stage 3 – v2 (Family / Circles)

- [ ] Support multi-user “circles”:
  - [ ] Show contacts’ locations on Home map
  - [ ] Simple presence indicator (online/recently active)
- [ ] Optional background tracking mode (opt-in, clearly explained)
- [ ] Emergency notifications (email/SMS):
  - [ ] Integration with email/SMS provider
  - [ ] Opt-in per contact

---

## Stage 4 – Scale & Quality

- [ ] E2E tests for critical flows (login, tracking, emergency)
- [ ] Basic CI pipeline:
  - [ ] Lint + test on push
- [ ] EAS build + Play Store release
- [ ] Monitoring/logging strategy:
  - [ ] Capture backend errors
  - [ ] Minimal operational metrics

---

## Stage 5 – Premium (Optional)

- [ ] Premium tiers:
  - [ ] Extra contacts
  - [ ] Extended history (beyond 7–30 days)
  - [ ] Family map features
- [ ] Stripe integration for subscriptions
- [ ] Feature gating in-app
