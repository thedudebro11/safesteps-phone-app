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

Expected:

posts active + emergency

fetches history (all + mode filter)