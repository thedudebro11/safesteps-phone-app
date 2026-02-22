# SafeSteps – Changelog

All notable changes to this project will be documented in this file.

Format: Keep a running **[Unreleased]** section, and cut releases when versions are tagged.

---

## [Unreleased]

### Added
- Initial Expo + React Native + Expo Router setup
- Tab navigation (Home, Contacts, History, Settings)
- Auth stack (login, register)
- Supabase client + environment configuration
- AuthProvider + useAuth with session persistence
- Settings screen with account info and logout
- Global route protection to send unauthenticated users to `/login` and active sessions (user or guest) to `/home`.
- “Create an account” button on the login screen linking to the register flow.

### Changed
- “Added Home Welcome card showing session identity (guest vs signed in).”
- Defined v1 share link model: recipient-scoped links with expiration and on/off; guest sharing uses ephemeral server relay (minimum live snapshot, deleted on end).

### Fixed
- Logout / Exit Guest Mode from the Settings screen now reliably clears auth/guest state and redirects back to `/login` on web and native.

---



## [0.1.0] – (pre-v1 internal)
> Placeholder for first internal milestone.
- Project initialized

# SafeSteps — Changelog

All notable changes to this project will be documented in this file.

Format: Maintain **[Unreleased]**, cut releases when versions are tagged.

---

## [Unreleased]

### Added
- Locked V1 UI/UX structure and screen responsibilities:
  - Home (tracking + map only)
  - Contacts (trusted contacts + start share per contact)
  - Shares (active share session management)
  - History (logs + map focus + directions)
  - Settings (account + privacy)
- New tab: **Shares**
- Home primary action renamed: **“Ping Now” → “Share Live Location”** (funnels to Contacts)
- History per-entry actions:
  - `Location Ping` (focus map to ping)
  - `Directions` (open external maps app chooser)
- Share entry points:
  - Home → Contacts
  - Shares → Contacts

### Changed
- V1 philosophy tightened: **session-based, consent-driven**; no silent tracking
- Emergency mode defined as:
  - distinct state (`EMERGENCY`)
  - red labeling
  - account-only
  - sends to all trusted contacts
  - overrides active tracking
- Documentation updated to reflect tier rules, signal state semantics, and share session model.

### Fixed
- (No new fixes logged)

---

## [0.1.0] — pre-v1 internal
- Project initialized


## [Unreleased]
### Added
- Local-first Contacts + Shares domain layer (Context providers)
- Storage adapter (web localStorage, native AsyncStorage, fallback in-memory)
- Shares tab + sessions UI
- Cross-platform confirm helper for web/native destructive actions

# Changelog

## Unreleased

### Fixed
- Emergency mode now stays in sync across Home / Contacts / Shares:
  - Stopping the last emergency share from Contacts or Shares stops Emergency on Home.
  - Stopping Emergency on Home ends all emergency shares everywhere.

### Added
- Emergency recipient picker polish:
  - Enforces selection limit (guest = 1)
  - Clear UI copy + selection count
  - Tap-outside-to-close behavior without stealing touches inside modal

### Updated
- Trusted Contacts limit now enforced centrally by ContactsProvider using tier rules.
  - Contacts screen relies on provider enforcement (prevents UI/logic mismatch).


- Fix: stopping Active Tracking now ends live share sessions (prevents Contacts showing SHARING after tracking stops)



## [V1 Milestone] - Live Visibility System Complete

### Added
- Authenticated live presence system (Supabase JWT validated)
- Bidirectional trust + visibility controls
- Expiring live_presence model (90s TTL)
- Secure /api/live/visible endpoint
- In-app live polling (5s interval)
- Dual-account automated integration test
- REQUIRE_AUTH hardened production mode

### Security
- Bearer token required for all visibility endpoints
- No guest live visibility
- Visibility is owner-controlled per trusted user

Status: Stable

## 2026-02-22 — Milestone: Authenticated Live Visibility (V1)

### Added
- Trusted contacts system (request/accept/deny + list)
- Visibility permissions per trusted contact (owner -> viewer)
- Live presence storage with expiry window (~90s)
- Live visibility endpoint filtered by trust + visibility + expiry
- Trusted UI (add by email, incoming requests, instant toggles)
- Map polling for /api/live/visible to show contacts live in-app
- Automated dual-account integration test script

### Changed
- AuthProvider contract + routing gates updated
- Tracking now posts authed location updates to server when logged in

### Security
- REQUIRE_AUTH=true support (Supabase JWT validation)
- Server-side enforcement of trust + visibility rules (client cannot bypass)