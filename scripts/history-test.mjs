// scripts/history-test.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

function mustEnv(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

const API_BASE_URL = mustEnv("API_BASE_URL").replace(/\/+$/, "");
const SUPABASE_URL = mustEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = mustEnv("SUPABASE_ANON_KEY");

// Use one account for history testing
const EMAIL = mustEnv("ACCOUNT_A_EMAIL");
const PASSWORD = mustEnv("TEST_A_PASSWORD");

console.log("Lume / SafeSteps — History Test");
console.log("API_BASE_URL:", API_BASE_URL);

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

async function login() {
  const { data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw error;
  const token = data.session?.access_token;
  const userId = data.user?.id;
  if (!token || !userId) throw new Error("Login succeeded but missing token/userId");
  return { token, userId };
}

async function api(path, { token, method = "GET", json } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: json ? JSON.stringify(json) : undefined,
  });

  const text = await res.text().catch(() => "");
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && (parsed.error || parsed.message)) ||
      `Request failed (${res.status})`;
    throw new Error(String(msg));
  }

  return parsed;
}

function isoMinusMinutes(min) {
  return new Date(Date.now() - min * 60 * 1000).toISOString();
}

(async () => {
  console.log("\n=== 1) Login via Supabase ===");
  const { token, userId } = await login();
  console.log("userId:", userId);
  console.log("token:", token.slice(0, 12) + "..." + token.slice(-8));

  console.log("\n=== 2) POST /api/locations (active) ===");
  const active = await api("/api/locations", {
    token,
    method: "POST",
    json: { lat: 32.2226, lng: -110.9747, accuracyM: 12 },
  });
  console.log(active);

  console.log("\n=== 3) POST /api/emergency (emergency) ===");
  const emergency = await api("/api/emergency", {
    token,
    method: "POST",
    json: { lat: 32.2230, lng: -110.9752, accuracyM: 9 },
  });
  console.log(emergency);

  // pull last 30 minutes
  const from = isoMinusMinutes(30);
  const to = new Date().toISOString();

  console.log("\n=== 4) GET /api/history (from/to last 30 mins) ===");
  const histAll = await api(`/api/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    token,
  });
  console.log(JSON.stringify(histAll, null, 2));

  console.log("\n=== 5) GET /api/history?mode=emergency ===");
  const histEmergency = await api(
    `/api/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&mode=emergency`,
    { token }
  );
  console.log(JSON.stringify(histEmergency, null, 2));

  console.log("\n✅ Done.");
})().catch((e) => {
  console.error("\n❌ History test failed:", e?.message ?? e);
  process.exit(1);
});