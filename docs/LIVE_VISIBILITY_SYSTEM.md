# Milestone: Authenticated Live Visibility (V1)

Date: 2026-02-22

## Summary
Implemented a production-grade live visibility system where users can see trusted contacts on the map only when:
1) Trust is accepted
2) Visibility is explicitly enabled (owner -> viewer)
3) Contact has posted a recent live presence ping (expires ~90s)
4) Requests are authenticated via Supabase JWT (REQUIRE_AUTH=true)

This milestone includes:
- Trust requests (request / accept / deny)
- Trusted contacts list UI with instant toggle updates
- Visibility rules enforced server-side
- Live presence storage + expiry model
- Map polling to show nearby trusted users in real time
- Automated dual-account integration test script
- AuthProvider cleanup + session handling fixes

## Data Model (Supabase)
### trusted_contacts
Directional trust relationship.
- requester_user_id (A)
- requested_user_id (B)
- status: pending | accepted | denied

When accepted, a reciprocal row is created so each user has an "accepted" record in their own direction.

### live_visibility
Directional visibility permission (owner controls whether viewer can see them).
- owner_user_id (me)
- viewer_user_id (contact)
- can_view boolean

### live_presence
Latest live location for each user (upserted).
- user_id (unique)
- lat, lng, accuracy_m
- mode: active | emergency
- updated_at
- expires_at (now + 90s)

## Backend API (Express)
### Auth Enforcement
All trust/visibility/live endpoints require a valid Bearer JWT when REQUIRE_AUTH=true.
Bearer tokens are validated using Supabase anon client (supabaseAuth.auth.getUser).

### Endpoints
- POST /api/trust/request
- GET  /api/trust/requests/incoming
- POST /api/trust/requests/:id/accept
- POST /api/trust/requests/:id/deny
- GET  /api/trust/list
- POST /api/visibility/set
- GET  /api/live/visible
- POST /api/locations  (authed -> writes live_presence)

### Visibility Filter Logic (live/visible)
Returns only users who:
- have unexpired live_presence
- have a live_visibility row where owner allows viewer
- are trusted_contacts accepted (viewer -> owner)
This ensures visibility is enforced even if a client tries to request everything.

## Frontend
### Trust UI
The Contacts tab was replaced with a Trusted screen powered by server-backed trust:
- load trusted contacts from /api/trust/list
- allow adding by email (trust request)
- accept/deny incoming trust requests
- toggle shareEnabled using /api/visibility/set with optimistic update

### Map UI
Home map polls /api/live/visible on an interval and renders markers for returned users.
Requires attaching Authorization bearer token when authed.

## Test Harness
`scripts/live-visibility-test.mjs` logs into two Supabase accounts using email/password and verifies:
- trust list is readable for both accounts
- visibility toggles can be enabled in both directions
- location ping updates live_presence
- /api/live/visible returns the other account correctly

PASS criteria:
✅ A sees B in /api/live/visible
✅ B sees A in /api/live/visible

## Files Changed / Added
See `docs/FILES_live-visibility_v1.md` for the exact list and responsibilities.