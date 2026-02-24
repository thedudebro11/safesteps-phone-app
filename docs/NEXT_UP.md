# Next Up: History (V1)

Goal: Implement location history so users can review past pings/events in-app.

## Scope (V1)
- Record timeline entries for:
  - Active tracking pings
  - Emergency pings (clearly labeled)
- Display a history list screen (tab: History)
- Basic filters:
  - Today / 7 days / 30 days (paid later if you want)
  - Active vs Emergency
- Tap entry -> details (lat/lng, timestamp, accuracy, mode)
- Data source:
  - Authed users: server + Supabase table
  - Guests: local-only storage (AsyncStorage)

## Backend plan
- New table: location_history (or location_events)
  - id (uuid)
  - user_id (uuid)
  - lat, lng, accuracy_m
  - mode (active|emergency)
  - created_at
- Endpoints:
  - GET /api/history?from=&to=&mode=
  - (Optional) GET /api/history/latest
- Security:
  - RLS: user can only read their own history
  - Writes only from server (service role) OR via RPC with auth context

## Frontend plan
- History tab UI
- Hook: useHistory()
  - fetch history
  - loading/error states
  - pull-to-refresh
  - pagination (optional)


  # Next Up: History (V1)

## Current status
- `location_history` table exists + indexed + RLS enabled
- History test script exists (logs in, posts pings, fetches history)
- Next code step: server route + server writes are being finalized

# Next Up: History (V1)

Status:
- ✅ Supabase table created: `public.location_history`
- ✅ Server writes history events from `/api/locations` + `/api/emergency`
- ✅ GET `/api/history` endpoint supports `from`, `to`, `mode`
- ✅ History UI screen scaffolding added (`app/(tabs)/history.tsx`)
- ✅ History test script exists (`scripts/history-test.mjs`)

Critical setup note:
- Server requires `SUPABASE_SERVICE_ROLE_KEY` in `server/.env` to insert history rows.
- Scripts use `.env.local` (root). Server uses `server/.env`.