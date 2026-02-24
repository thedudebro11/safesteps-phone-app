## Local dev: env files (important)

There are TWO separate env contexts:

### A) Mobile app / scripts (project root)
- File: `.env.local`
- Used by:
  - Expo app (via `EXPO_PUBLIC_*`)
  - Node test scripts (ex: `scripts/live-visibility-test.mjs`, `scripts/history-test.mjs`)
- Contains:
  - API_BASE_URL
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - ACCOUNT_A_EMAIL / ACCOUNT_A_PASSWORD
  - ACCOUNT_B_EMAIL / ACCOUNT_B_PASSWORD

### B) Server API (server folder)
- File: `server/.env`
- Used by: `npm run api` (loads `server/.env` inside `server/index.js`)
- MUST contain:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY   ← required for server inserts (live_presence + location_history)
  - REQUIRE_AUTH=true (recommended)