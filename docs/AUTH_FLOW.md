# SafeSteps — Authentication & Guest Flow

_Last updated: 2025-12-11_

This document describes the complete authentication, guest access, and navigation behavior of the SafeSteps mobile application.

It is an authoritative reference for:
- How auth state is represented
- How guest mode works
- How routing decisions are made
- How logout / exit guest is handled safely on all platforms

---

## 1. Goals

- Allow users to use SafeSteps **immediately** without account creation.
- Support a clean upgrade path from guest → authenticated user.
- Maintain a simple, auditable auth model:
  - One source of truth for auth + guest state
  - Centralized routing logic
- Ensure deterministic behavior on **native and web**.

---

## 2. Core Auth Concepts

### 2.1 Authenticated User (Supabase Session)

An authenticated user is backed by Supabase Auth.

Provides:
- `user.id` (UUID)
- `user.email`
- Access token (JWT) for backend API calls

Server-side source of truth for:
- `location_pings`
- `trusted_contacts`
- Future: family groups, share links, subscriptions

---

### 2.2 Guest Session (Local-Only)

A guest session allows immediate use without an account.

Characteristics:
- Represented by a local-only flag in `AuthProvider`
- No Supabase user
- No JWT
- No backend access

Intended for:
- Trying the app before signing up
- Local-only tracking and history
- Zero server persistence

Guest data is **not synced** and is lost when the guest session ends.

---
## Guest Sharing Behavior (v1)

Guest mode is local-only **by default**.

However, share links require a server to be usable and enforceable. Therefore:

- Guest tracking/history remains on device.
- If the user explicitly enables sharing, the app temporarily relays the **minimum required live location snapshot** to the server until:
  - the share expires, or
  - the user turns sharing off, or
  - a recipient link is revoked.
- After the share ends, links are invalid and share data is deleted.



## 3. AuthProvider API

`src/features/auth/AuthProvider.tsx` exposes the following state and actions:

### 3.1 State

- `user: User | null`
- `session: Session | null`
- `guestMode: boolean`
- `isAuthLoaded: boolean`
  - `true` once initial Supabase session check completes
- `isAuthActionLoading: boolean`
  - `true` while sign-in / sign-up / sign-out is in progress

### 3.2 Derived Flags

- `isAuthenticated = !!user`
- `isGuest = guestMode && !user`
- `hasSession = isAuthenticated || isGuest`

`hasSession` is the **single source of truth** for route access.

---

### 3.3 Actions

- `signInWithEmail(email, password)`
- `signUpWithEmail(email, password)`
- `startGuestSession()`
  - Clears any Supabase state
  - Sets `guestMode = true`
- `signOut()`
  - If authenticated:
    - Calls `supabase.auth.signOut()`
  - Clears:
    - `user`
    - `session`
    - `guestMode`

---

## 4. Navigation & Route Protection

### 4.1 Root Layout (`app/_layout.tsx`)

The root layout is responsible for **all routing decisions**.

Behavior:
- Wraps the app in `<AuthProvider>`
- Waits for `isAuthLoaded`
- Forces navigation based on `hasSession`

Routing rules:

- `hasSession === false` → `/login`
- `hasSession === true` → `/home`

Implementation pattern:

```ts
if (!hasSession) {
  router.replace("/login");
} else {
  router.replace("/home");
}
