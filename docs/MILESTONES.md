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
