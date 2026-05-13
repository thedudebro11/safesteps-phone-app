# SafeSteps — Issue Log

_Last updated: 2026-05-12_

> **Note for agents:** This is a historical record of bugs and how they were resolved. A few entries reference APIs or patterns that have since changed:
> - **`isAuthLoaded`**: referenced as "the correct variable" in early entries. It is NOT currently exported from `AuthProvider`. The current flag is `isAuthActionLoading` (which covers both hydration and action loading).
> - **`hasSession`**: referenced in early entries as an exported prop. NOT currently exported. Current routing uses `isAuthenticated` only.
> - **`router.replace` after logout**: documented as a fix in Issue #11. Current pattern: screens do NOT call `router.replace` — `_layout.tsx` handles all redirects based on `isAuthenticated`.
> - **Guest mode entries (#4, #9)**: guest mode was partially prototyped and then deferred. It is NOT currently implemented. See `docs/AUTH_FLOW.md` Part 2 for the full build spec.

---

## Resolved Issues

---

### Issue 1 — Login: CORS Blocking Supabase Auth (Web)

**Symptom:** `POST /auth/v1/token` blocked, no `Access-Control-Allow-Origin`.

**Cause:** Supabase project hadn't whitelisted the dev origin (`http://localhost:8081`).

**Fix:** Supabase Dashboard → Authentication → URL Configuration → add `http://localhost:8081`.

**Status:** Resolved.

---

### Issue 2 — Stale `react-server-dom-webpack` in Lockfile (False Positive)

**Symptom:** Entry visible in `package-lock.json`; concern about CVE-2025-55182.

**Investigation:** `npm ls react-server-dom-webpack` returned empty. `npm why` returned nothing. Not in dependency tree. `npm audit`: 0 vulnerabilities. SafeSteps does not use React Server Components.

**Conclusion:** Stale lockfile metadata, not an active dependency. No action required.

**Status:** Resolved (not applicable).

---

### Issue 3 — Logout Button Not Responding on Settings Screen

**Symptom:** Tapping Logout did nothing; no console output.

**Cause:** `onPress` attached to wrong element (inner child, not `Pressable` wrapper).

**Fix:** Moved `onPress` to the `Pressable` parent directly.

**Status:** Resolved.

---

### Issue 4 — Guest Mode Not Routing to Home Reliably *(early prototype)*

> **Note:** Guest mode was later deferred entirely. `isGuest` is currently hardcoded `false`. This issue describes a prototype behavior. See `docs/AUTH_FLOW.md` Part 2 for the build spec when guest mode is implemented.

**Symptom:** Guest mode worked once, then stopped updating the screen.

**Cause:** `hasSession` didn't change after first guest attempt → router didn't re-run.

**Historical fix:** Added `router.replace("/home")` inside guest handler; moved gating to root `_layout.tsx`.

---

### Issue 5 — Tabs Layout Error: "No route named '(tabs)' exists"

**Symptom:** Pressing Guest logged: `No route named "(tabs)" exists in nested children`.

**Cause:** Auth gating was placed inside `app/(auth)/_layout.tsx` instead of root `_layout.tsx`.

**Fix:** Root layout now owns all routing logic. Auth layout simplified to stack-only.

**Status:** Resolved.

---

### Issue 6 — Register Screen: "signUp does not exist on AuthContextValue"

**Symptom:** TypeScript error on `signUp`.

**Cause:** Refactor renamed `signUp` → `signUpWithEmail`.

**Fix:** Updated register screen to use `signUpWithEmail`.

**Status:** Resolved.

---

### Issue 7 — "isInitialLoading" Not Found on AuthContextValue

> **Note:** The fix here says "correct variable is `isAuthLoaded`" — but `isAuthLoaded` is also not currently exported. The current exported flag is `isAuthActionLoading` (covers both hydration and auth actions). This entry is historical; don't treat `isAuthLoaded` as the current API.

**Symptom:** TS error: property `isInitialLoading` missing.

**Cause:** Old code referencing a previous state name.

**Historical fix:** Use `isAuthLoaded` (which was exported at the time).

**Current API:** `isAuthActionLoading` in `AuthProvider.tsx`.

---

### Issue 8 — Web Build Opening Directly to /home Instead of Auth Screen

**Symptom:** New browser tab skipped login and went straight to Home.

**Cause:** Auth gating was only inside `(auth)` layout, not applied globally.

**Fix:** Centralized route logic in root `_layout.tsx`. Redirect to `/login` when no session.

**Status:** Resolved.

---

### Issue 9 — "Continue as Guest" Second Press Doesn't Update UI *(early prototype)*

> **Note:** Guest mode is currently deferred. See Issue 4 note.

**Symptom:** Pressing guest a second time after navigating didn't update the UI.

**Cause:** State didn't change → React didn't re-run routing logic.

**Historical fix:** Force `router.replace("/home")`.

---

### Issue 10 — Server Won't Start: Missing Supabase Env Vars

**Symptom:** Server exits immediately with missing env var errors.

**Cause:** `npm run start:server` (and `npm run api`) loads `server/.env`, not `.env.local`. The server requires `SUPABASE_SERVICE_ROLE_KEY` to write to Supabase tables.

**Fix:**
1. Open `server/.env`
2. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Restart: `npm run start:server`

**Status:** Resolved. (`.env.local` is for the app + scripts only.)

---

### Issue 11 — Logout / Exit Guest Mode Not Returning to Login on Web

> **Note:** The historical fix here called `router.replace("/login")` after `signOut()`. The **current architecture** does not do this — screens only mutate auth state; `_layout.tsx` handles all redirects automatically via `isAuthenticated`. The `router.replace` call is no longer needed and would be redundant.

**Symptom:** Tapping Log Out on web stayed on `/settings`.

**Root Cause:** `Alert.alert` destructive callback not reliably firing on web.

**Historical fix:** Removed `Alert.alert` wrapper; called `signOut()` directly then `router.replace("/login")`.

**Current pattern:** Call `signOut()` only. `_layout.tsx` redirects automatically. Do not add `router.replace`.

---

### Issue 12 — Presence OFF Delay (~2 Minutes)

**Symptom:** After stopping Active Tracking, other devices showed the user as live for ~2 minutes.

**Root Cause:** `/api/presence/stop` was returning 404 — server hadn't loaded the route (needed restart). Presence was relying on TTL expiry.

**Fix:**
- Restarted Express server to register the route
- `TrackingProvider.stopAll()` now calls `POST /api/presence/stop` → immediate row deletion
- Boost polling window (1s for 12s) makes the change near-instantly visible

**Status:** Resolved.

---

### Issue 13 — History Tab Stops Updating Without Filter Change

**Symptom:** History entries stopped appearing unless the Today filter was tapped again.

**Root Cause:** `to` timestamp computed inside `useMemo` with `[filters]` dependency → frozen until filters changed.

**Fix:** Moved `buildRange()` inside the fetch function so `to` is recomputed on every request. Added silent refresh mode and stable `FlatList` keys.

**Status:** Resolved.

---

### Issue 14 — Stale Live Shares After App Restart (Mobile)

**Symptom:** After Metro restart, Contacts/Shares showed "SHARING" but Home showed tracking OFF.

**Root Cause:** `SharesProvider` rehydrates from AsyncStorage on boot. `TrackingProvider` always boots in `idle`. No reconciliation between the two.

**Fix:** Boot-time reconciliation: if shares are loaded + tracking is `idle` + any shares are `live` → end them all immediately. Guards: `hydratedOnceRef` (SharesProvider), `bootReconciledRef` (TrackingProvider).

**Status:** Resolved.

---

### Issue 15 — Stop Active Tracking Didn't End Live Share Sessions

**Symptom:** After stopping Active Tracking, Contacts still showed SHARING.

**Root Cause:** `stopAll()` in `TrackingProvider` stopped the loop but didn't call `endAllLiveShares()`.

**Fix:** `TrackingProvider.stopAll()` now captures previous mode; calls `SharesProvider.endAllLiveShares()` if previous mode was `active` or `emergency`.

**Invariant added:** If tracking transitions from `active`/`emergency` → `idle`, no live shares may remain.

**Status:** Resolved.

---

### Issue 16 — Emergency Share State Not Clearing When Emergency Stopped

**Symptom:** Stopping Emergency left share sessions as `live` in Contacts/Shares UI.

**Root Cause:** `stopAll()` only ended shares for `active` mode, not `emergency`.

**Fix:** Updated `stopAll()` to end all live shares when exiting either `active` or `emergency`.

**Status:** Resolved.

---

## Open / Known Gaps

- Contacts screen should show inline banner when contact limit is reached (instead of an alert)
- `isPremium` is hardcoded `false` — tier-gated limits for premium users not enforced
- Guest mode not implemented — `isGuest` hardcoded `false` (see `docs/AUTH_FLOW.md` Part 2)
- Share sessions are in-memory — reset on server restart (see `docs/NEXT_UP.md`)
- Persistent rate limiting not yet implemented (in-memory map resets on restart)
