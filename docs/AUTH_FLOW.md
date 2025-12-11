
---

### 2️⃣ `docs/AUTH_FLOW.md`

```md
# SafeSteps — Authentication & Guest Flow

_Last updated: 2025-12-10_

## 1. Goals

- Allow new users to use SafeSteps **immediately** without creating an account.
- Keep architecture ready for:
  - Family accounts
  - Cloud sync
  - Trusted contacts
  - Premium subscriptions
- Keep logic simple & auditable:
  - One source of truth for auth/guest state
  - Centralized route gating

---

## 2. Core Concepts

### 2.1 Supabase User Session

- Represents a real authenticated account.
- Provides:
  - `user.id` (UUID)
  - `user.email`
  - Access token (JWT) used when calling backend API.
- Source of truth for server-side data:
  - `location_pings`
  - `trusted_contacts`
  - Future: family groups, share links, subscriptions, etc.

### 2.2 Guest Session

- Represented by a **local-only** flag in `AuthProvider`:
  - `guestMode: boolean`
- Does **not** have a Supabase user or JWT.
- Intended for:
  - Local-only tracking & history
  - “Try it first, sign up later” UX

---

## 3. AuthProvider API

`src/features/auth/AuthProvider.tsx` exposes:

- `user: User | null` — Supabase user or `null`
- `session: Session | null` — Supabase session or `null`
- `isAuthLoaded: boolean` — true once initial Supabase `getSession()` completes
- `isAuthActionLoading: boolean` — true while login/signup/logout is in-flight

Guest/session helpers:

- `guestMode: boolean` — raw flag for guest mode
- `startGuestSession(): void`  
  - Clears Supabase user/session state
  - Sets `guestMode = true`
- `endGuestSession(): Promise<void>`  
  - Sets `guestMode = false`

Derived booleans:

- `isAuthenticated = !!user`
- `isGuest = guestMode && !user`
- `hasSession = isAuthenticated || isGuest`

Auth actions:

- `signInWithEmail(email, password)`
- `signUpWithEmail(email, password)`
- `signOut()`:
  - If Supabase user exists, calls `supabase.auth.signOut()`
  - Clears `user`, `session`, and `guestMode`

---

## 4. Navigation Logic

### 4.1 Root Layout (`app/_layout.tsx`)

The root layout:

- Wraps children in `<AuthProvider>`.
- Reads `isAuthLoaded` and `hasSession` via `useAuth()`.
- Uses a `useEffect` to **force the URL** based on auth state:

```ts
useEffect(() => {
  if (!isAuthLoaded) return;

  if (!hasSession) {
    router.replace("/login");
  } else {
    router.replace("/home");
  }
}, [isAuthLoaded, hasSession, router]);
