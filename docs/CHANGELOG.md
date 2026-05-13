# SafeSteps — Changelog

_Last updated: 2026-05-12_

> **Note for agents:** This is a historical record. Early entries describe architecture that has since been replaced. Key changes to be aware of:
> - **Guest mode**: early entries describe guest mode as implemented. It is NOT currently implemented (`isGuest` is hardcoded `false`). See `docs/AUTH_FLOW.md` Part 2 for the build spec.
> - **Local-first contacts**: early entries describe a local-first contacts/shares provider. This was replaced by the server-backed trust system (`/api/trust/*`). Current architecture: `docs/architecture/STRUCTURE.md`.
> - **`hasSession`**: referenced in early entries as a real exported value. It is NOT currently exported from `AuthProvider`. The current routing gate is `isAuthenticated` only.
> - **`router.replace` after logout**: early entries show this pattern. Current pattern: screens mutate auth state only; `_layout.tsx` handles all redirects. See `docs/AUTH_FLOW.md` section 1.3.

---

## [Unreleased]

### Added (2026-05-13 — Map, Performance & Profile Photo Pass)

#### Map
- **Dark navy map style** — 24-rule custom Google Maps JSON style matching `#050814` app theme. Roads, water, POIs, labels all reskinned. Applied via `customMapStyle` prop on `MapView`.
- **Custom contact markers** (`src/features/home/components/ContactMarker.tsx`) — 44px circle avatar with colored border (green = live, red = emergency pulse animation), profile photo or initials fallback, name label pill, stem indicator
- **Tap-to-directions** — tapping a contact marker shows a callout card (name + live/emergency status) that opens native maps app for directions (`maps://` iOS, `geo:` Android, Google Maps URL fallback)
- `tracksViewChanges={isEmergency}` — prevents per-frame marker re-renders except during emergency pulse, preserving map scroll performance

#### Profile Photos
- **Avatar upload in Settings** — photo picker (`expo-image-picker`), square crop, 0.6 quality compression, direct upload to Supabase Storage `avatars` bucket
- **Remove photo** — sets `avatar_url = null` in profiles table
- `avatar_url` column added to `profiles` table
- `avatars` Supabase Storage bucket created (public read, authenticated write to own folder)
- Cache-buster (`?t=<timestamp>`) appended to avatar URLs on upload to force image cache invalidation
- `/api/live/visible` now returns `avatarUrl` — contact markers on map show real profile photos

#### Performance
- **`get_visible_users()` Postgres RPC** — single JOIN query replaces 4 sequential round trips in `/api/live/visible`. Reduces DB load ~4x and response latency from ~80–160ms to ~20–40ms per map poll
- **PgBouncer enabled** — connection pooling active in Supabase dashboard. Warm pool of 15 Postgres connections eliminates per-request connection setup overhead (~20–50ms saved per request under load)

#### Dependencies
- `expo-image-picker ~17.0.11` added
- `zod ^3.25.x` added to root `package.json` (was missing — caused Railway crash on deploy)
- `packageManager: npm@10.8.2` declared in `package.json`
- All 5 Expo SDK patch versions bumped to match SDK 54 requirements (expo-doctor 17/17 ✅)

### Added (2026-05-12 — Production Build Pass)
- **Guest mode fully implemented** — `startGuestSession()` / `endGuestSession()` in AuthProvider, persistent guest flag via `readGuestFlag()` / `writeGuestFlag()`, `onAuthStateChange` fixed to not clear guest on SIGNED_OUT
- **`isGuest` stub removed** — `isGuest` now correctly derived from real `guestMode` state
- **`isPremium` stub removed** — wired to `PremiumProvider.usePremium()`, hardcode gone from `ContactsProvider`
- **`PremiumProvider`** created at `src/features/premium/PremiumProvider.tsx` — RevenueCat stub, ready to wire
- **Membership screen** — full tier comparison table (Guest/Free/Premium), CTA, restore purchases
- **`_layout.tsx`** routing updated to use `hasSession` (accepts both authenticated users and guests)
- **"Continue as Guest"** button added to login screen
- **Emergency mode gated on `!isGuest`** — shows account creation prompt for guests
- **Settings screen** rebuilt — display name edit, subscription section, privacy policy + ToS links, app version
- **Contacts screen** — inline tier limit banner replaces Alert.alert for limit errors, inline success/error feedback
- **ErrorBoundary** component at `src/components/ErrorBoundary.tsx`, wraps all tab screens
- **Backend Zod validation** — all routes now use `validate()` middleware from `server/lib/validate.js`
- **DB-backed share sessions** — `server/routes/shares.js` replaces in-memory Map, SHA-256 token hashing
- **`POST /api/users/profile`** — update display name endpoint
- **`GET /api/shares/active`** and **`GET /api/shares/:token/status`** endpoints added
- **CORS hardened** — `ALLOWED_ORIGINS` allowlist in production
- **Rate limiting** on `/api/locations` (10s) and `/api/emergency` (5s) for authenticated users
- **`stopAll()`** exposed from `useTracking()` context
- **`app.json`** cleaned up — dark theme, deduped permissions, correct splash background `#050814`, iOS `bundleIdentifier` set
- **`eas.json`** updated — `autoIncrement: true` for production, `cli.version >= 7.0.0`, submit config

### Added
- Emergency push notifications (`POST /api/emergency/alert` → Expo Push API)
- Push token registration (`POST /api/push/register`, `push_tokens` table)
- Emergency alert deduplication (90s window via `emergency_alerts` table)
- Background location task wiring (`src/lib/backgroundLocationTask.ts`)

---

## [V1 Milestone] — Live Visibility System Complete

### Added
- Authenticated live presence system (Supabase JWT validated)
- Bidirectional trust + visibility controls (`trusted_contacts`, `live_visibility` tables)
- Expiring `live_presence` model (90s TTL)
- `GET /api/live/visible` — filtered by trust + visibility + expiry
- In-app live polling (5s base, 1s boost for 12s)
- `POST /api/presence/stop` — immediate presence deletion on tracking stop
- Dual-account automated integration test (`scripts/live-visibility-test.mjs`)
- `REQUIRE_AUTH` hardened production mode

### Security
- Bearer token required for all visibility/trust endpoints
- Visibility is owner-controlled per trusted user
- Server enforces all permission checks (client cannot bypass)

---

## 2026-03-03 — Presence OFF Delay Fixed (Instant Stop)

### Problem
Active Tracking OFF could take up to ~2 minutes to reflect on other devices.

### Root Cause
`live_presence` rows relied on TTL expiration when tracking stopped. The explicit `/api/presence/stop` route was returning 404 because the route wasn't registered — server needed a restart.

### Fix
- Restarted Express server to register the route
- `TrackingProvider.stopAll()` now calls `stopPresence()` → `POST /api/presence/stop`
- Presence deletion is immediate (row deleted, not TTL-expired)
- Boosted polling (1s for 12s) makes the change visible near-instantly

---

## [Milestone] — History Tab (V1 Complete)

### Added
- `location_history` Supabase table (id, user_id, lat, lng, accuracy_m, mode, created_at)
- Server writes history events from `POST /api/locations` and `POST /api/emergency`
- `GET /api/history` endpoint (from/to/mode filters, newest-first, limit 200)
- History UI screen (`app/(tabs)/history.tsx`)
- Silent auto-refresh while focused (no loading flicker)
- `buildRange()` logic moved inside fetch function so `to` timestamp never freezes
- History test script (`scripts/history-test.mjs`)

### Fixed
- History tab stopped updating unless filter was changed — root cause: `to` timestamp was frozen in `useMemo`. Fixed by recomputing on every fetch.

---

## [Milestone] — Emergency/Share Sync

### Added
- `emergencySync.ts` — `shouldStopEmergencyAfterEndingShare()` helper
- Emergency mode now stays in sync across Home / Contacts / Shares:
  - Stopping the last emergency share from Contacts or Shares stops Emergency on Home
  - Stopping Emergency on Home ends all emergency shares everywhere
- Emergency recipient picker: enforces tier limit (guest = 1), clear UI copy

### Fixed
- Stopping Active Tracking now ends live share sessions (prevents Contacts showing SHARING after tracking stops)
- `TrackingProvider.stopAll()` captures previous mode; calls `endAllLiveShares()` if previous mode was `active` or `emergency`

---

## [Milestone] — Boot Reconciliation

### Fixed
- Stale "live" shares persisting after app restart (mobile only):
  - `SharesProvider` rehydrates from AsyncStorage on boot
  - `TrackingProvider` always boots in `idle` mode
  - Boot reconciliation: if shares are loaded + tracking is idle + any shares are `live` → end them all immediately
  - Guards: `hydratedOnceRef` (SharesProvider), `bootReconciledRef` (TrackingProvider)

---

## [Milestone] — Home Screen Map-First UI

### Added
- `MapFirstHomeScreen.native.tsx` — map as base layer
- `BottomActionDrawer.tsx` — height-animated free-drag drawer (no snap)
  - Bottom edge permanently anchored to tab bar via `bottom: tabBarHeight`
  - Height animated between `COLLAPSED_H` and `MAX_HEIGHT` (not translateY)
  - `PanResponder` attached to handle zone only (no gesture conflicts with slider)
  - Drawer always starts collapsed; reliable after hot reload
- Ping frequency slider (discrete steps, battery impact label)

---

## Early Development (Pre-V1)

### Added
- Initial Expo + React Native + Expo Router setup
- Tab navigation (Home, Contacts, Shares, History, Settings)
- Auth stack (login, register)
- Supabase client + environment configuration
- `AuthProvider` + `useAuth` with session persistence
- Settings screen with account info and logout
- `confirm()` cross-platform helper (`src/lib/confirm.ts`) — `window.confirm` on web, `Alert.alert` on native

### Changed
- V1 philosophy locked: **session-based, consent-driven**; no silent tracking
- Emergency mode defined: distinct state, red labeling, account-only, overrides active tracking
- History entries use stable `keyExtractor={(item) => String(item.id)}`

### Fixed
- CORS: added `http://localhost:8081` to Supabase Auth URL configuration
- Expo Router TS errors after route group restructure: resolved with `npx expo start -c`
- Server won't start: `npm run api` loads `server/.env`, not `.env.local` — service role key must be in `server/.env`

---

## [0.1.0] — Pre-V1 Internal
- Project initialized
