# Milestones

## 2026-02-22 — Live trusted tracking works end-to-end
✅ Two authed accounts can:
- Send trust requests / accept / deny
- Show accepted contacts in `/api/trust/list`
- Toggle directional visibility (`/api/visibility/set`)
- Post live presence (`/api/locations`, `expires_at` ~90s)
- See live markers only when:
  - trusted == accepted
  - visibility == true (owner → viewer)
  - presence is active and not expired
- Map UI now renders other user markers in-app (not just via script)

Notes:
- REQUIRE_AUTH=true supported (real JWT verification via Supabase)
- Added node test script to validate live visibility deterministically

## 2026-02-22 — Live Visibility Milestone + History Kickoff

### ✅ Live visibility works (authed)
- Trust list loads
- Incoming requests: accept/deny works
- Visibility toggle updates instantly
- Live pings stored in `live_presence`
- `/api/live/visible` returns visible users correctly
- Map UI now shows other user markers in-app

### ✅ REQUIRE_AUTH now enforced
Server runs with `REQUIRE_AUTH=true` for real token behavior.

### 🔥 Critical fix: server env loading (supabaseAdmin)
Problem:
- `npm run api` failed with:
  "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in server/.env"

Cause:
- Env vars were not available when `server/lib/supabaseAdmin.js` was imported (load-order / dotenv path issues).

Fix:
- `server/lib/supabaseAdmin.js` now ensures dotenv loads the correct `server/.env` BEFORE reading `process.env`.
- Confirmed server starts and can access Supabase clients reliably after this.

### ✅ History table created (Supabase)
Created `public.location_history` with indexes + RLS:
- RLS: authenticated users can select their own rows.

### ✅ History test script added
- `npm run history:test` logs into Supabase via `.env.local`, posts active + emergency pings, then fetches `/api/history` and prints rows.

 Fix: "Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY"

Cause:
- API reads env from `server/.env`, not `.env.local`.
- If server/.env lacks SUPABASE_SERVICE_ROLE_KEY (or file not loaded), `server/lib/supabaseAdmin.js` throws immediately.

Fix:
- Ensure `server/index.js` loads dotenv from `server/.env`
- Ensure `server/.env` contains:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - REQUIRE_AUTH=true (recommended)

What happened and why it was slow
Symptom

Turning Active Tracking OFF took ~1–2 minutes to disappear on the other phone.

Turning ON was fast, OFF was delayed.

Root cause

Your system was behaving exactly like a TTL-based presence model:

live_presence rows have an expires_at (90s).

When tracking stops, if you don’t delete/clear presence, other users keep seeing you until TTL expires.

We added an explicit stop route, but it still didn’t work at first…

The real blocker that made it “still slow”

Your client logs proved it:

The app called POST /api/presence/stop

It returned 404 Cannot POST /api/presence/stop

Meaning: the server process running did not have the new route loaded.

Final fix

You restarted the Express server (npm run api) and instantly the route existed and deletes started working.

Your server logs confirm the whole chain:

✅ presence stop route loaded

[presence/stop] hit { hasAuth: true, requireAuth: true }

[presence/stop] user { userId: 'ok' }

[presence/stop] delete { ok: true }

After that:

OFF became fast because live_presence row is deleted immediately

Other phones remove you on the next poll (and with your boosted polling, it feels near-instant)

Files changed (what we’re committing)
Server

server/index.js

Added POST /api/presence/stop

Added debug logs: “route loaded”, hit/user/delete logs

Uses requireBearer (REQUIRE_AUTH=true)

Deletes from live_presence by user_id

Client

src/features/tracking/TrackingProvider.tsx

Added stopPresence() called from stopAll() to clear presence instantly

Added logs to prove token + response status (you used these to catch the 404)

Important: stopPresence defined above stopAll (avoid hoist/runtime issues)

src/features/home/MapFirstHomeScreen.native.tsx

Added boosted polling window for near-instant UI updates after toggles

Added in-flight guard to prevent overlapping fetches

Dynamic polling: 1s during boost, 5s otherwise