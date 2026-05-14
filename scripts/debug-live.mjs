import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { data } = await sb.auth.signInWithPassword({ email: process.env.ACCOUNT_A_EMAIL, password: process.env.ACCOUNT_A_PASSWORD });
const res = await fetch(process.env.API_BASE_URL + "/api/live/debug", { headers: { Authorization: "Bearer " + data.session.access_token } });
console.log(JSON.stringify(await res.json(), null, 2));
