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

  ## Running the project (local dev)

Terminal A (API):
```bash
cd C:\Users\oscar\safesteps-app
npm run api

Terminal B (Expo):

cd C:\Users\oscar\safesteps-app
npm run start

Optional (web + api together):

npm run dev
Environment files

server/.env is used by the Express API (Supabase keys, REQUIRE_AUTH, PORT).

.env.local is used by Node test scripts in /scripts (API_BASE_URL + Supabase anon + test account creds).

If npm run api complains about missing SUPABASE_*:

You are missing values in server/.env

Or dotenv is not loading the server/.env you expect (make sure server/index.js loads server/.env explicitly).