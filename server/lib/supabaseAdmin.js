// server/lib/supabaseAdmin.js
const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
// ✅ Always load server/.env even if this module is required before server/index.js runs dotenv
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in server/.env");
}

const commonOpts = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "X-Client-Info": "lume-server",
    },
  },
};

// Elevated server client (server secret key — never expose)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, commonOpts);

// Used to validate JWTs from the app (Bearer token)
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, commonOpts);

module.exports = { supabaseAdmin, supabaseAuth };