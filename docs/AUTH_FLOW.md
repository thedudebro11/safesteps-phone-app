# SafeSteps — Authentication & Session Flow

_Last updated: 2026-05-12_

This document defines the authoritative authentication behavior for SafeSteps.

It covers:
- Current implemented auth states
- AuthProvider API (what the code exposes today)
- Route protection rules
- Planned guest mode (implementation spec — not yet built)

---

## Part 1 — Current Implementation

### 1.1 Runtime Auth States

SafeSteps currently supports **two** runtime states:

| State | Condition | Access |
|---|---|---|
| **No Session** | `isAuthenticated = false` | Auth screens only (`/(auth)/*`) |
| **Authenticated** | Supabase `user` + `session` present | Full app (`/(tabs)/*`) |

Guest mode is **not yet implemented** — see Part 2 for the full implementation spec.

---

### 1.2 AuthProvider API (`src/features/auth/AuthProvider.tsx`)

**Exposed state:**

```ts
user: User | null
session: Session | null
isAuthenticated: boolean      // Boolean(session?.user?.id)
isGuest: boolean              // hardcoded false until guest mode is built
isAuthActionLoading: boolean  // true during hydration + any auth action
```

**Actions:**

```ts
signUpWithEmail(email: string, password: string): Promise<void>
signInWithEmail(email: string, password: string): Promise<void>
signOut(): Promise<void>
```

`signOut()` calls `supabase.auth.signOut()`. The `onAuthStateChange` listener clears `user` and `session` automatically.

---

### 1.3 Route Protection (`app/_layout.tsx`)

The root layout is the **single authority** for navigation decisions.

```ts
if (!isAuthenticated && !inAuthGroup) → Redirect to /(auth)/login
if (isAuthenticated && inAuthGroup)   → Redirect to /(tabs)/home
```

Screens never call `router.push/replace/reset` after auth actions — they mutate auth state only and let the layout react.

---

### 1.4 Route Groups

```
(auth)/
  login
  register

(tabs)/
  home
  contacts
  shares
  history
  membership
  settings
```

---

### 1.5 Authenticated User Profile Invariant

Every authenticated Supabase user must have exactly one row in `public.profiles`.

This is required for: user lookup by email, trusted contacts, visibility permissions, live map sharing, emergency alert copy.

**How it's enforced:** `AuthProvider` performs an idempotent upsert into `profiles` on session load and on `onAuthStateChange` when a real user session is detected.

```ts
await supabase.from("profiles").upsert(
  { user_id: user.id, email: user.email, display_name: user.user_metadata?.display_name },
  { onConflict: "user_id" }
);
```

Do not remove or bypass this logic.

---

### 1.6 Push Token Registration

On every authenticated session, `AuthProvider` calls `registerPushToken()` once per distinct `user.id` (tracked via `registeredForUserId` ref). Session token refreshes for the same user do not re-register.

---

## Part 2 — Planned: Guest Mode

> **Status: NOT YET IMPLEMENTED.** `isGuest` is currently hardcoded `false`.
>
> This section is the full implementation spec — ready to build when the time comes.

---

### 2.1 What Guest Mode Is

Guest mode lets users use SafeSteps immediately without creating an account.

- No Supabase user
- No JWT
- Local-only storage (history, contacts)
- Limited feature set (see `docs/TIERS.md`)
- One active share session max
- No emergency mode

Guest mode exits cleanly into the sign-up/login flow. Guest data is not migrated to a new account (V1).

---

### 2.2 New Runtime Auth States (After Guest Mode Ships)

| State | `isAuthenticated` | `isGuest` | `hasSession` |
|---|---|---|---|
| No Session | false | false | false |
| Guest | false | true | true |
| Authenticated | true | false | true |

`hasSession = isAuthenticated || isGuest` becomes the routing gate (replaces bare `isAuthenticated` check).

---

### 2.3 AuthProvider Changes Required

**New state:**
```ts
guestMode: boolean     // persisted via AsyncStorage (native) / localStorage (web)
isAuthLoaded: boolean  // true once initial session + guest flag resolution completes
```

**New derived flags:**
```ts
isGuest = guestMode && !user
hasSession = isAuthenticated || isGuest
```

**New actions:**
```ts
startGuestSession(): Promise<void>
  // 1. Call supabase.auth.signOut() to clear any stale Supabase state
  // 2. Set guestMode = true
  // 3. Persist guest flag (writeGuestFlag(true))
  // Do NOT clear guestMode in the SIGNED_OUT listener (see race condition below)

endGuestSession(): Promise<void>
  // 1. Clear guestMode = false
  // 2. Persist flag (writeGuestFlag(false))
  // 3. Clear local history / tracking timers
  // layout will redirect to /login automatically via hasSession = false
```

**Guest flag persistence:**
```ts
const GUEST_FLAG_KEY = "safesteps_guest";

// web: localStorage.getItem/setItem
// native: AsyncStorage.getItem/setItem
async function readGuestFlag(): Promise<boolean>
async function writeGuestFlag(on: boolean): Promise<void>
```

**Session hydration update (loadSession):**
```ts
// If no Supabase user AND storedGuest === true:
//   setSession(null); setUser(null); setGuestMode(true);
```

**Critical: auth listener race condition fix**

`supabase.auth.signOut()` inside `startGuestSession()` fires `onAuthStateChange(SIGNED_OUT, null)`. The listener must NOT clear `guestMode` when `newSession` is null:

```ts
supabase.auth.onAuthStateChange((_event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  // Only clear guestMode if a REAL user session comes in:
  if (newSession?.user) setGuestMode(false);
  // Do NOT touch guestMode when newSession is null
});
```

---

### 2.4 Route Protection Update

```ts
// Replace:
if (!isAuthenticated && !inAuthGroup) → redirect to login

// With:
if (!hasSession && !inAuthGroup) → redirect to login
if (hasSession && inAuthGroup)  → redirect to home
```

---

### 2.5 Feature Gating

Navigation tabs are **always visible** regardless of tier. Features are gated inside screens.

| Feature | Guest | Free Account | Premium |
|---|---|---|---|
| Active tracking | ✅ (limited intervals) | ✅ | ✅ |
| Emergency mode | ❌ | ✅ | ✅ |
| Trusted contacts | 1 max | 3 max | 10 max |
| Emergency recipients | 1 max | 3 max | 10 max |
| Location history | Local only | Cloud-backed | Cloud-backed |
| Share sessions | 1 active | Multiple (tier) | Multiple (tier) |

Limits are enforced by `src/lib/tiers.ts` (`getEmergencyRecipientLimit`, `getTrustedContactLimit`).

---

### 2.6 Guest Logout / Exit

Settings screen calls `endGuestSession()`. It must NOT call `router.replace` — the layout handles the redirect once `hasSession` becomes false.

**Invariant:** Tracking timers must stop before guest session ends. `endGuestSession()` should call `TrackingProvider.stopAll()` or equivalent before clearing state.

---

### 2.7 Guest Sharing

When a guest creates a live share, the minimum relay goes through the server:
- Only a live location snapshot is relayed
- Server enforces expiration, token validity, revocation
- When sharing ends, server-side share data is cleared

Rate limiting enforced by `requireGuestShare()` in `server/index.js`.

---

### 2.8 Full File Touch List for Guest Mode Implementation

Every file that needs to change when guest mode is built. Use this as a checklist:

**`src/features/auth/AuthProvider.tsx`**
- Add `guestMode` state + `readGuestFlag()` / `writeGuestFlag()` persistence
- Add `startGuestSession()` and `endGuestSession()` actions
- Expose `isGuest`, `hasSession`, `isAuthLoaded` (separate from `isAuthActionLoading`)
- Fix `onAuthStateChange` listener to not clear `guestMode` on `SIGNED_OUT` event
- Restore guest flag during initial `loadSession()`

**`app/_layout.tsx`**
- Change routing gate from `isAuthenticated` to `hasSession`
- Import `isGuest` / `hasSession` from `useAuth()`

**`src/features/contacts/ContactsProvider.tsx`**
- Change `isGuest` source from hardcoded `false` to `useAuth().isGuest`
- Remove the `// wire later` comment on line 50

**`src/features/tracking/TrackingProvider.tsx`**
- Ensure `stopAll()` is called before guest session ends
- Guest exit must clear all timers (already handled if `stopAll()` is called first)

**`src/features/emergency/EmergencyRecipientsModal.tsx`**
- Gate emergency mode on `!isGuest` (guests cannot use emergency mode)

**`app/(tabs)/settings.tsx`**
- Wire "Exit Guest Mode" button to `endGuestSession()` (not `signOut()`)
- Do NOT call `router.replace` after — layout handles it

**`app/(auth)/login.tsx` + `register.tsx`**
- Wire "Continue as Guest" button to `startGuestSession()`
- Do NOT call `router.replace` after — layout handles it

**`src/lib/tiers.ts`** — already correct, no changes needed

**`server/index.js`** — `requireGuestShare()` already handles guest share path, no changes needed

---

## 3. Update Policy

Update this file when:
- AuthProvider API changes
- Route structure changes
- Guest mode is built (move Part 2 from "Planned" to "Implemented" and update Part 1)
- New session types are introduced
