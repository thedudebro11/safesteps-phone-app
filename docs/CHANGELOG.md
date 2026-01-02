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
