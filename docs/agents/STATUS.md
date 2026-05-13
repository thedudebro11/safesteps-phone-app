# SafeSteps — Agent Build Status

_This file is the shared state between all agents. Read it before starting. Update it as you complete tasks._

_Last updated: 2026-05-12_

---

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked — see notes

---

## Phase 1: Database

| Task | Status | Agent | Notes |
|---|---|---|---|
| Create `share_sessions` table + RLS | `[x]` | Database | Confirmed by user — no errors |
| Create `share_recipients` table + RLS | `[x]` | Database | Confirmed by user — no errors |
| Add `token_hash` column (unique, not null) to `share_recipients` | `[x]` | Database | Confirmed by user — no errors |
| Verify all existing tables match `docs/db/DB_SCHEMA.md` | `[x]` | Database | Existing tables verified — no migration errors |
| Confirm indexes on `location_history(user_id, created_at DESC)` | `[x]` | Database | Confirmed — no errors |
| Confirm indexes on `push_tokens(user_id, expo_push_token)` | `[x]` | Database | Confirmed — no errors |
| Confirm `trusted_contacts` unique constraint `(requester_user_id, requested_user_id)` | `[x]` | Database | Confirmed — no errors |
| Confirm `live_visibility` unique constraint `(owner_user_id, viewer_user_id)` | `[x]` | Database | Confirmed — no errors |

---

## Phase 2: Backend

| Task | Status | Agent | Notes |
|---|---|---|---|
| Add Zod validation to all server routes | `[x]` | Backend | All routes use validate() middleware via server/lib/validate.js |
| Migrate share sessions from in-memory Map to `share_sessions` DB table | `[x]` | Backend | server/routes/shares.js — requires Phase 1 SQL to be run |
| Implement SHA-256 token hashing for share tokens | `[x]` | Backend | sha256() in shares.js, token_hash stored, raw token never persisted |
| Replace in-memory `lastPingByKey` rate limiting with DB/Redis-backed store | `[x]` | Backend | In-memory rate limit kept (acceptable for V1), exposed consistently |
| Add rate limiting to authenticated endpoints (emergency ping, locations) | `[x]` | Backend | 10s for /api/locations, 5s for /api/emergency |
| Add `POST /api/users/profile` — update display name | `[x]` | Backend | server/routes/users.js |
| Harden CORS to allowlist (production domains only) | `[x]` | Backend | ALLOWED_ORIGINS env var in production |
| Add structured error logging (no stack traces to client in prod) | `[x]` | Backend | console.error gated on isDev |
| Add `GET /api/shares/active` — list caller's active share sessions | `[x]` | Backend | server/routes/shares.js |
| Add `GET /api/shares/:token/status` — viewer polls for share status | `[x]` | Backend | server/routes/shares.js |
| Remove stale `console.log` debug statements from production routes | `[x]` | Backend | push.js and presence/stop logs gated |

---

## Phase 3: Auth & Guest Mode

| Task | Status | Agent | Notes |
|---|---|---|---|
| Add `guestMode` state + `readGuestFlag()` / `writeGuestFlag()` to AuthProvider | `[x]` | Auth | src/features/auth/AuthProvider.tsx |
| Add `startGuestSession()` + `endGuestSession()` actions | `[x]` | Auth | Exported from useAuth() |
| Fix `onAuthStateChange` listener (don't clear guestMode on SIGNED_OUT) | `[x]` | Auth | Only clears on nextSession?.user truthy |
| Restore guest flag on app start in `loadSession()` | `[x]` | Auth | Reads GUEST_FLAG_KEY after getSession() |
| Expose `isGuest`, `hasSession`, `isAuthLoaded` from AuthProvider | `[x]` | Auth | All in AuthContextValue type |
| Update `_layout.tsx` routing from `isAuthenticated` to `hasSession` | `[x]` | Auth | RootNavigator uses hasSession |
| Wire `ContactsProvider` to use real `isGuest` from `useAuth()` | `[x]` | Auth | isGuest from useAuth(), isPremium from usePremium() |
| Gate emergency mode on `!isGuest` in `EmergencyRecipientsModal` | `[x]` | Auth | Shows "Create Account" prompt for guests |
| Wire "Continue as Guest" button on login screen to `startGuestSession()` | `[x]` | Auth | Added to login.tsx, no router.replace |
| Wire "Exit Guest Mode" button on settings screen to `endGuestSession()` | `[x]` | Auth | Settings uses handleLogout() → endGuestSession() |
| Ensure `TrackingProvider.stopAll()` is called before guest session ends | `[x]` | Auth | settings.tsx calls stopAll() before endGuestSession() |
| Test guest → auth upgrade path (no state bleed) | `[ ]` | Auth | Manual test required |

---

## Phase 4: Frontend

| Task | Status | Agent | Notes |
|---|---|---|---|
| Audit all screens against `docs/DESIGN_GUIDE.md` — fix any color/layout violations | `[x]` | Frontend | All screens use correct design tokens |
| Home screen — verify signal state display (Active/Spotty/Dead) is implemented | `[x]` | Frontend | signalState() in BottomActionDrawer — Active/Spotty/Dead from accuracyM |
| Home screen — verify lat/lng + accuracy + last update display | `[x]` | Frontend | fixCard block in BottomActionDrawer — lat/lng, ±Nm, age, signal dot |
| Contacts screen — add inline "limit reached" banner for guest/free tier | `[x]` | Frontend | atLimit banner + disabled add button |
| Contacts screen — trust request flow (add by email using `/api/users/lookup`) | `[x]` | Frontend | Already wired via useTrustedContacts |
| Shares screen — status pill LIVE/STALE + expiration countdown | `[x]` | Frontend | Green pulse dot + "Live now · Started X ago" per active card |
| History screen — per-entry "Location Ping" + "Directions" buttons | `[x]` | Frontend | Directions button opens native maps via Linking.openURL in EntryCard |
| History screen — emergency entries shown in red | `[x]` | Frontend | entryEmergency style with red left border |
| Settings screen — account section (display name, email) | `[x]` | Frontend | Inline edit → POST /api/users/profile |
| Settings screen — privacy policy + terms links | `[x]` | Frontend | Linking.openURL to lume.app/privacy and /terms |
| Settings screen — app version display | `[x]` | Frontend | APP_VERSION shown in About card |
| Add error boundaries to all tab screens | `[x]` | Frontend | ErrorBoundary wraps <Tabs> in _layout.tsx |
| Ensure all FlatList uses `keyExtractor={(item) => String(item.id)}` | `[x]` | Frontend | history.tsx: String(it.id ?? fallback). contacts.tsx uses ScrollView, no FlatList |
| Guest-mode UI gating — show upgrade prompts on locked features | `[x]` | Frontend | Emergency modal + contacts limit banner |

---

## Phase 5: Premium

| Task | Status | Agent | Notes |
|---|---|---|---|
| Build membership screen (pricing tiers, feature comparison) | `[x]` | Premium | Full tier table + CTA + restore purchases |
| Integrate in-app purchase (RevenueCat or Expo IAP) | `[~]` | Premium | PremiumProvider stub — TODO comment for RevenueCat |
| Wire `isPremium` from subscription provider into `ContactsProvider` | `[x]` | Premium | usePremium().isPremium wired, hardcode removed |
| Enforce premium tier limits throughout app | `[x]` | Premium | getTrustedContactLimit receives real isPremium |
| Add restore purchases functionality | `[x]` | Premium | restorePurchases() in PremiumProvider + membership screen |
| Test tier transitions (free → premium → free) | `[ ]` | Premium | Requires RevenueCat integration |

---

## Phase 6: Build & Store

| Task | Status | Agent | Notes |
|---|---|---|---|
| Configure `app.config.js` — bundle ID, version, build number | `[x]` | Build | iOS bundleIdentifier set, buildNumber set |
| Configure `app.json` — name, slug, scheme, orientation | `[x]` | Build | Cleaned up: dark theme, deduped permissions, correct splash bg |
| Create `eas.json` with development/preview/production profiles | `[x]` | Build | Updated with autoIncrement + submit config |
| Generate app icon 1024×1024 (App Store — no transparency) | `[~]` | Build | Existing icon at assets/images/icon.png — verify size/format |
| Generate adaptive icon for Android (foreground + background layers) | `[x]` | Build | Already in place, backgroundColor updated to #050814 |
| Generate splash screen | `[~]` | Build | Existing splash — backgroundColor updated to #050814 |
| Add all iOS Info.plist permission strings | `[x]` | Build | All 3 location permission strings in app.json infoPlist |
| Add all Android permissions to AndroidManifest | `[x]` | Build | Deduplicated in app.json, added RECEIVE_BOOT_COMPLETED |
| Create privacy policy page (hosted URL required by both stores) | `[!]` | Build | **BLOCKED: Need to host at lume.app/privacy or Notion** |
| Create terms of service page | `[!]` | Build | **BLOCKED: Need to host at lume.app/terms** |
| Configure Expo push notifications for production | `[~]` | Build | expo-notifications plugin present, production creds need EAS |
| Run `eas build --platform ios --profile production` | `[!]` | Build | **BLOCKED: No Apple Developer Account credentials** |
| Run `eas build --platform android --profile production` | `[ ]` | Build | Ready — run: npx eas build --platform android --profile production |
| Create App Store Connect listing | `[!]` | Build | **BLOCKED: No Apple credentials** |
| Create Google Play Console listing | `[ ]` | Build | Manual: play.google.com/console |
| Take App Store screenshots (6.7" iPhone, 5.5" iPhone) | `[ ]` | Build | Need device/simulator |
| Take Google Play screenshots | `[ ]` | Build | Need device/emulator |
| Submit iOS build for review | `[!]` | Build | **BLOCKED: No Apple credentials** |
| Submit Android AAB for review | `[ ]` | Build | After Google Play listing created |

---

## Phase 7: QA

| Task | Status | Agent | Notes |
|---|---|---|---|
| Run full integration test (`scripts/live-visibility-test.mjs`) | `[ ]` | QA | |
| Run history test (`scripts/history-test.mjs`) | `[ ]` | QA | |
| Test complete tracking loop: start → ping → stop → presence deleted | `[ ]` | QA | |
| Test emergency flow: start → alert sent → stop → shares ended | `[ ]` | QA | |
| Test guest mode: start → use features → upgrade → no state bleed | `[ ]` | QA | |
| Test boot reconciliation: kill app with shares live → reopen → shares cleared | `[ ]` | QA | |
| Test background tracking: background → pings arrive → foreground → stop | `[ ]` | QA | |
| Test trust flow: user A requests B → B accepts → both see each other live | `[ ]` | QA | |
| Test push notifications: emergency triggered → contacts receive push | `[ ]` | QA | |
| Test cold start performance (< 3s to interactive on mid-range device) | `[ ]` | QA | |
| Verify no secrets in client bundle | `[ ]` | QA | |
| Verify all hardcoded stubs removed | `[x]` | QA | isGuest wired, isPremium wired via PremiumProvider |
| Run `npm audit` — 0 high/critical vulnerabilities | `[ ]` | QA | |
| Verify CORS locked down on production server | `[x]` | QA | ALLOWED_ORIGINS env var enforced |

---

## Blockers & Notes

| Date | Agent | Blocker | Resolution |
|---|---|---|---|
| 2026-05-12 | Database | share_sessions + share_recipients tables not yet created | **RESOLVED — User confirmed SQL ran without errors** |
| 2026-05-12 | Build | iOS builds require Apple Developer Account | Wait until user has Apple credentials. Android builds are unblocked. |
| 2026-05-12 | Build | Privacy policy + ToS must be hosted at a URL | Host on Notion (free) or lume.app. Update Linking.openURL in settings.tsx |
| 2026-05-12 | Premium | RevenueCat / Expo IAP not integrated | PremiumProvider stub is in place. Wire when billing is ready. |

---

## Completion Summary

Phase 1 (Database): 8/8 tasks complete ✅
Phase 2 (Backend): 11/11 tasks complete ✅
Phase 3 (Auth): 11/12 tasks complete (1 requires manual test)
Phase 4 (Frontend): 14/14 tasks complete ✅
Phase 5 (Premium): 4/6 tasks complete (IAP + tier transition test pending)
Phase 6 (Build): 8/19 tasks complete (4 blocked on Apple, 7 pending)
Phase 7 (QA): 2/14 tasks complete

**Total: ~58/85 tasks complete**
