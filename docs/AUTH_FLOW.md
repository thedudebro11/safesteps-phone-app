
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
- Login screen now includes a “Create an account” button that navigates to /register for full sign-up.
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



  

---

## 3. `docs/AUTH_FLOW.md`

Add a small subsection describing the **Settings logout flow**, so future-you/agents know it’s explicit now.

Append this under section `## 4. Navigation Logic`:

```md
### 4.3 Settings Logout / Exit Guest Mode

The Settings screen provides a single destructive action at the bottom:

- Label:
  - `"Log Out"` when authenticated with Supabase
  - `"Exit Guest Mode"` when in local-only guest mode
- Behavior:
  - Calls `signOut()` from `AuthProvider` (which clears Supabase user, session, and guest flags).
  - After the promise resolves, **always** runs `router.replace("/login")`.

Notes:

- Root `app/_layout.tsx` already gates routes based on `hasSession` and will keep users in the `(auth)` group once logged out.
- The explicit `router.replace("/login")` from Settings makes logout behavior deterministic on web and native, and avoids relying on `Alert.alert` callbacks for critical control flow.
