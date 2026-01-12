1. Login: CORS blocking Supabase Auth request (500 errors in web)

Symptom:
POST /auth/v1/token blocked by CORS, no Access-Control-Allow-Origin.

Cause:
Web build hitting Supabase Auth from Expo web without correct origin config.

Fix:

Configure Supabase → Authentication → URL settings

Add development origin (http://localhost:8081)

Restart dev server

Status: Resolved.

2. Stale react-server-dom-webpack entry in package-lock.json (false positive vulnerability concern)

Symptom:
You saw react-server-dom-webpack inside lockfile, worried about the React CVE.

Cause:
Stale metadata in lockfile from internal deps, not actually installed.

Fix:

rm -rf node_modules package-lock.json

Reinstall

Verified not in dependency tree (npm ls, npm why)

Status: Resolved.

3. Logout button not working (no console log, no state change)

Symptom:
Tapping Logout did nothing.

Root cause:
onPress wasn’t firing due to shadowed Pressable + no console output.

Fix:

Added console log

Ensured correct function reference

Confirmed signOut() executed

Verified route protection working

Status: Resolved.

4. Guest mode not routing to Home reliably

Symptom:
Guest mode worked once or twice, then stopped updating the screen.

Cause:
hasSession didn’t change after first guest attempt → router didn’t rerun navigation logic.

Fix:

Added explicit router.replace("/home") inside handleGuest()

Moved route gating into root _layout.tsx

Status: Resolved.

5. Tabs layout not recognized: “No route named '(tabs)' exists”

Symptom:
When pressing Guest, error logged:

No route named "(tabs)" exists in nested children: ['login', 'register']


Cause:
Auth gating was placed inside app/(auth)/_layout.tsx instead of the root app _layout.tsx.

Fix:

Root layout now manages routing

Auth layout simplified to stack-only

Tabs layout unaffected

Status: Resolved.

6. Register screen failing: “signUp does not exist on AuthContextValue”

Symptom:
TypeScript error on signUp.

Cause:
Refactor renamed signUp → signUpWithEmail.

Fix:
Updated register screen to use new API.

Status: Resolved.

7. “isInitialLoading” not found on AuthContextValue

Symptom:
TS error: property missing.

Cause:
Old tutorial code referencing previous state names.

Fix:
Correct variable is isAuthLoaded.

Status: Resolved.

8. Web build opening directly to /home instead of auth screen

Symptom:
Opening a new browser tab skipped login and went straight to Home.

Cause:
Auth gating not applied globally — was inside (auth) layout only.

Fix:

Centralized route logic in root layout

Added router.replace("/login") when no session present

Status: Resolved.

9. “Continue as Guest” from login → doesn’t refresh screen

Symptom:
Pressing guest again after navigating once didn’t update the UI.

Cause:
State didn’t change → React didn’t rerun rerouting logic.

Fix:
Force router navigation with:

router.replace("/home");


Status: Resolved.

### 2025-12-10 — Investigated CVE-2025-55182 (React Server RCE)

ISSUE:
Found references to "react-server-dom-webpack" inside package-lock.json.
Concern that SafeSteps may be affected by CVE-2025-55182 (React Server Functions RCE).

INVESTIGATION:
- Ran `npm ls react-server-dom-webpack`: (empty) → not installed.
- Ran `npm why react-server-dom-webpack`: no dependencies found.
- Deleted node_modules + lockfile and reinstalled clean.
- Verified again: package not in dependency tree.
- Searched codebase for any RSC / react-server imports → none found.
- Verified SafeSteps does NOT use Next.js App Router, React Server Components, or Server Actions.
- Ran `npm audit`: 0 vulnerabilities.

CONCLUSION:
SafeSteps is **not** affected. The entry in package-lock.json was a **stale metadata reference**, not an active dependency. No server code in SafeSteps uses the vulnerable RSC / Flight protocol.

ACTION TAKEN:
- No patches needed for SafeSteps frontend.
- Confirmed backend (Express) does not use React Server Functions.
- Added documentation here for future audits.


## 2025-12-11 — Logout / Exit Guest Mode Does Not Return to Login on Web

### Problem

On Expo web, tapping **“Log Out”** or **“Exit Guest Mode”** on the Settings screen showed no navigation change.  
The console showed the button `onPress` firing, but the app stayed on `/settings` and the session sometimes remained in an inconsistent state.

### Context

- Screen: `app/(tabs)/settings.tsx`
- Environment: Expo web (`platform=web`) at `http://localhost:8081`
- Using `useAuth()` for `signOut` and guest mode handling
- Root `app/_layout.tsx` already uses `hasSession` to route between `(auth)` and `(tabs)` groups

### Root Cause

The confirmation flow used `Alert.alert(...)` and put the real `signOut()` / guest-exit logic inside the destructive action’s `onPress` callback.

On web, that callback was not reliably firing, so:

- The **initial button press** log appeared.
- But `signOut()` and navigation never executed.

This left the UI on `/settings` even when the intent was to log out or exit guest mode.

### Solution

1. Removed the `Alert.alert` confirmation wrapper from `Settings` logout logic on web.
2. Simplified `handleLogout` to:

   - Log the press for debugging.
   - Directly call `await signOut()` (or the guest exit path).
   - Immediately call `router.replace("/login")` after auth state is cleared.

3. Verified in console:

   - `[Settings] Logout button pressed …`
   - `[Auth] state changed { hasSession: false, isGuest: false, ... }`
   - `[Settings] signOut() completed, navigating to /login`

4. Confirmed that the root auth gating (based on `hasSession`) still behaves correctly and that explicit `router.replace("/login")` keeps UX deterministic on web.

### Why This Happened

Relying on `Alert.alert` for critical control flow on web made logout behavior dependent on browser-specific dialog handling.  
When the `onPress` of the destructive Alert action didn’t run, the app silently skipped the important logic.

### How to Prevent This in the Future

- Avoid using `Alert.alert` for **critical auth flows** (logout, account deletion) on web.
- Prefer a deterministic pattern:

  ```ts
  await signOut();
  router.replace("/login");


# Known Issues / Next Improvements

- Contacts screen should show a nicer, non-alert UX when contact limit reached
  - Example: disable “+ Add” and show inline banner with “Upgrade to add more contacts”


## [2026-01-11] Guest: Stop Active Tracking did not stop Live Share

### Symptom
In guest mode:
1) Start Active Tracking on Home
2) Go to Contacts (share flow) and tap “Share Location Link”
3) Go back Home and stop Active Tracking
✅ Tracking stopped
❌ Contacts still showed SHARING / share session remained live

Emergency behaved correctly: stopping Emergency also stopped the share state everywhere.

### Expected Behavior
When Active Tracking is stopped, any live share sessions created for that tracking run should be ended so the UI and app state remain consistent.

### Root Cause
The “stop active tracking” path was stopping the tracking loop, but it was not reliably ending live share sessions.
This created a state mismatch:
- Tracking mode became idle
- Shares stayed live
- Contacts UI (derived from shares) continued to show SHARING

### Fix
1) Introduced a provider-level helper to end shares in bulk:
- `endAllLiveShares()` in `SharesProvider`
  - Marks all live shares as ended (local state)
  - Best-effort notifies server (`/api/shares/end`) for each token

2) Updated tracking shutdown behavior:
- `TrackingProvider.stopAll()` now captures the previous mode before switching to idle.
- If the previous mode was `"active"`, it calls `endAllLiveShares()` after stopping the interval.

This makes Active Tracking → STOP behave like a single “session end” that also closes any live shares started during that session.

### Invariant added
If tracking transitions from `"active"` → `"idle"`, there must be no remaining `"live"` share sessions.

### Files touched
- `src/features/shares/SharesProvider.tsx`
- `src/features/tracking/TrackingProvider.tsx`
