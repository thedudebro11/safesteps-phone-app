# SafeSteps — Architecture & Structure (V1)

This document describes the **shipping** repo structure for SafeSteps V1 (Expo + Supabase-first).

---

## 1) Tech Stack

- **Expo (React Native)**
- **Expo Router**
- **TypeScript**
- **Supabase** (Auth + Postgres + RLS)
- Secure session persistence:
  - **SecureStore** (iOS/Android)
  - local storage fallback (web)

Optional (only if/when needed):
- Supabase **Edge Functions** (share viewer, rate limits, guest relay)
- Node/Express service (later; not required to ship V1)

---

## 2) Routing & Navigation

### Route groups
- `(auth)` — unauthenticated screens
- `(tabs)` — main app (guest or authenticated)

### Tabs (locked)
- Home
- Contacts
- Shares
- History
- Settings

---

## 3) Recommended Folder Structure

```txt
app/
  _layout.tsx                 # wraps app with AuthProvider
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx               # bottom tab navigator
    home.tsx                  # tracking + map
    contacts.tsx              # manage contacts + start share for a contact
    shares.tsx                # manage active share sessions
    history.tsx               # location logs + location ping + directions
    settings.tsx              # account + privacy + logout

providers/
  AuthProvider.tsx            # session + guest mode + auth actions
  TrackingProvider.tsx        # single-timer tracking state machine (V1)

lib/
  supabase.ts                 # typed supabase client
  storage.ts                  # secure storage abstraction (native/web)
  geo.ts                      # geolocation helpers + reverse geocode wrappers
  share.ts                    # share session helpers (create/revoke/copy)

types/
  models.ts                   # shared types (Ping, Contact, ShareSession)

4) Data Flow (High Level)

Home reads real-time location + tracking state from TrackingProvider.

TrackingProvider writes pings to:

local store (guest)

Supabase (location_pings) when authenticated

Contacts creates a share session for a selected trusted contact.

Shares lists active share sessions and revokes/ends them.

History lists pings (local for guest, Supabase for authenticated) and provides:

“Location Ping” (focus map to that point)

“Directions” (open external maps app)

5) Security Defaults

Secrets are never in the app bundle:

Supabase anon key in app (allowed)

service role keys only server-side (Edge Function / backend)

All DB access is enforced by RLS.

Share links use high-entropy tokens and store token hashes, not raw tokens.