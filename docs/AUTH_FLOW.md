# SafeSteps — Authentication & Guest Flow

_Last updated: 2026-01-02_

This document defines the **authoritative authentication, guest mode, and routing behavior** for the SafeSteps application.

It describes:
- Auth state representation
- Guest session behavior
- Route protection and navigation rules
- Logout / exit guest handling
- How auth state gates features (not navigation)

This file is intentionally focused on **state and flow**, not security primitives
(see `SECURITY_NOTES.md` for security guarantees).

---

## 1) Goals

- Allow users to use SafeSteps **immediately** without account creation
- Support a clean, explicit upgrade path from guest → authenticated user
- Maintain a **single source of truth** for auth + guest state
- Ensure deterministic behavior across **iOS, Android, and Web**
- Keep navigation stable even when features are gated

---

## 2) Runtime Auth States (Locked)

SafeSteps supports **exactly three** runtime states:

### 2.1 No Session
- No Supabase session
- `guestMode = false`
- User must remain in auth flow

### 2.2 Guest Session
- No Supabase user
- `guestMode = true`
- Local-only usage
- Limited feature set

### 2.3 Authenticated Session
- Supabase `user` and `session` present
- Cloud-backed features allowed
- Row Level Security enforced

Only **one state** may be active at a time.

---

## 3) Core Concepts

### 3.1 Authenticated User (Supabase)

Authenticated users are backed by Supabase Auth.

Provides:
- `user.id` (UUID)
- `user.email`
- JWT for authenticated requests
- Access to cloud-backed features:
  - trusted contacts
  - share sessions
  - location history (tier-dependent)
  - emergency mode

---

### 3.2 Guest Session (Local-Only by Default)

Guest mode enables immediate use without an account.

Characteristics:
- Represented by a local-only `guestMode` flag
- No Supabase user
- No JWT
- No direct database access

Guest data:
- Stored locally on device
- Not synced to Supabase
- Lost if app data is cleared or guest mode is exited

Guest mode exists to:
- Try the app safely
- Understand UX and trust model
- Avoid forced signup

---

## 4) Guest Sharing Behavior (V1)

Guest mode is **local-only by default**.

However, **live location sharing** requires server mediation to be enforceable.

Therefore, when a guest explicitly initiates a share:

- Only the **minimum live location snapshot** is relayed
- Relay lasts **only for the active share session**
- The server enforces:
  - expiration
  - token validity
  - revocation
- When sharing ends:
  - server-side share data is deleted
  - links become invalid

Guest sharing is:
- explicit
- time-bounded
- recipient-specific
- limited to one active share (V1)

---

## 5) AuthProvider API (Source of Truth)

`src/features/auth/AuthProvider.tsx` exposes the **only authoritative auth state**.

### 5.1 State

- `user: User | null`
- `session: Session | null`
- `guestMode: boolean`
- `isAuthLoaded: boolean`
  - `true` once Supabase session resolution completes
- `isAuthActionLoading: boolean`
  - `true` while sign-in / sign-up / sign-out is in progress

---

### 5.2 Derived Flags (Locked)

```ts
isAuthenticated = !!user
isGuest = guestMode && !user
hasSession = isAuthenticated || isGuest
````

* `hasSession` is the **single routing gate**
* Feature access is controlled separately (by tier + mode)

---

### 5.3 Actions

* `signInWithEmail(email, password)`
* `signUpWithEmail(email, password)`
* `startGuestSession()`

  * Clears Supabase state
  * Sets `guestMode = true`
* `signOut()`

  * If authenticated:

    * calls `supabase.auth.signOut()`
  * Clears:

    * `user`
    * `session`
    * `guestMode`
    * tracking timers
    * in-memory state

---

## 6) Navigation & Route Protection (Expo Router)

### 6.1 Route Groups

* `(auth)`

  * `/login`
  * `/register`
* `(tabs)`

  * `/home`
  * `/contacts`
  * `/shares`
  * `/history`
  * `/settings`

---

### 6.2 Root Layout Rules (`app/_layout.tsx`)

The root layout owns **all navigation enforcement**.

Rules:

* If `hasSession === false`

  * force route to `/login`
* If `hasSession === true`

  * force route to `/home`

Pseudocode:

```ts
if (!hasSession) {
  router.replace("/login");
} else {
  router.replace("/home");
}
```

This ensures:

* No screen is accessible without an explicit session
* Guest and authenticated users share the same navigation shell
* The tab structure never changes (only feature availability does)

---

## 7) Tabs & Feature Gating (Important Distinction)

Navigation is **not** gated by auth tier.

Feature access **is**.

### Tabs (Always Visible)

* Home
* Contacts
* Shares
* History
* Settings

### Feature Gating Examples

* Guest:

  * cannot enable Emergency Mode
  * limited contacts
  * limited share sessions
  * local-only history
* Authenticated:

  * emergency enabled
  * cloud-backed history
  * multiple share sessions (tier-dependent)

This avoids UI churn and keeps mental models stable.

---

## 8) Logout & Exit Guest Mode (Safety Rules)

### 8.1 Authenticated Logout

On logout:

1. Call `supabase.auth.signOut()`
2. Clear persisted session storage
3. Stop all tracking timers
4. Clear in-memory state
5. `router.replace("/login")`

---

### 8.2 Exit Guest Mode

On exit guest:

1. Clear `guestMode`
2. Clear local-only tracking/history
3. Stop all timers
4. `router.replace("/login")`

**Critical rule:**
Timers and tracking must never survive logout or guest exit.

---

## 9) Invariants (Must Always Hold)

* There is exactly one active session state
* Tracking cannot run without a visible session
* Guest mode never silently escalates privileges
* Auth state changes always reset tracking state
* Routing depends only on `hasSession`, not tier

---

## 10) Update Policy

Update this file when:

* AuthProvider API changes
* Route structure changes
* Guest or authenticated capabilities change
* New session types are introduced

This file is the **authoritative auth & navigation reference** for SafeSteps.

## Auth & Navigation Invariant

SafeSteps does NOT navigate manually after auth actions.

Instead:

- Screens mutate auth state only (signIn, signOut, startGuestSession, endGuestSession)
- The root layout (`app/_layout.tsx`) is the single authority for redirects
- Navigation is derived from `hasSession` and `isAuthLoaded`

### Rules

- Screens MUST NOT call `router.push`, `router.replace`, or `router.reset` after auth actions
- Logout / guest exit only updates auth state
- `_layout.tsx` decides whether to show `(auth)` or `(tabs)`

This prevents:
- Auth flapping
- Unhandled navigator actions
- Guest ↔ authed race conditions
- Expo Router `(auth)` route errors


## Guest Mode Exit

Guest mode is a first-class session type.

- `endGuestSession()` clears the persisted guest flag
- No Supabase calls are required
- After guest exit, `hasSession === false`
- `_layout.tsx` automatically redirects to `/login`

Settings screens must NOT navigate manually.
