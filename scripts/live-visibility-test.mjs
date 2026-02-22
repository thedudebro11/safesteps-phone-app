import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

// Node 18+ has fetch built-in. If you’re on older Node, install node-fetch.
const API_BASE_URL = mustEnv("API_BASE_URL").replace(/\/+$/, "");
const SUPABASE_URL = mustEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = mustEnv("SUPABASE_ANON_KEY");

const ACCOUNT_A_EMAIL = mustEnv("ACCOUNT_A_EMAIL");
const ACCOUNT_A_PASSWORD = mustEnv("ACCOUNT_A_PASSWORD");
const ACCOUNT_B_EMAIL = mustEnv("ACCOUNT_B_EMAIL");
const ACCOUNT_B_PASSWORD = mustEnv("ACCOUNT_B_PASSWORD");

const TEST_BIDIRECTIONAL = String(process.env.TEST_BIDIRECTIONAL || "").toLowerCase() === "true";

function mustEnv(k) {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
}

function logStep(title) {
  console.log(`\n=== ${title} ===`);
}

function redactToken(token) {
  if (!token) return null;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

async function supabaseLogin(email, password) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Common: "Invalid login credentials"
    throw new Error(`[Supabase] Login failed for ${email}: ${error.message}`);
  }

  const session = data?.session;
  const user = data?.user;

  if (!session?.access_token || !user?.id) {
    throw new Error(`[Supabase] No session/user returned for ${email}`);
  }

  return {
    email,
    userId: user.id,
    accessToken: session.access_token,
  };
}

async function apiJson(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error ? String(json.error) : `${res.status} ${res.statusText}`;
    throw new Error(`[API ${method} ${path}] ${msg}`);
  }

  return json;
}

function pickFirstContactId(trustList) {
  const contacts = trustList?.contacts;
  if (!Array.isArray(contacts) || contacts.length < 1) {
    throw new Error("Trust list is empty. Add/accept trust first.");
  }
  const id = contacts[0]?.userId;
  if (!id || typeof id !== "string") throw new Error("Trust list returned invalid contact userId.");
  return id;
}

async function main() {
  console.log("Lume / SafeSteps — Live Visibility Test");
  console.log("API_BASE_URL:", API_BASE_URL);

  logStep("1) Login Account A + Account B via Supabase");
  const A = await supabaseLogin(ACCOUNT_A_EMAIL, ACCOUNT_A_PASSWORD);
  const B = await supabaseLogin(ACCOUNT_B_EMAIL, ACCOUNT_B_PASSWORD);

  console.log("A userId:", A.userId);
  console.log("A token:", redactToken(A.accessToken));
  console.log("B userId:", B.userId);
  console.log("B token:", redactToken(B.accessToken));

  logStep("2) GET /api/trust/list as A + B");
  const trustA = await apiJson("/api/trust/list", { token: A.accessToken });
  const trustB = await apiJson("/api/trust/list", { token: B.accessToken });

  console.log("trustA:", JSON.stringify(trustA, null, 2));
  console.log("trustB:", JSON.stringify(trustB, null, 2));

  const CONTACT_ID_FOR_A = pickFirstContactId(trustA); // from A perspective, this is B
  const CONTACT_ID_FOR_B = pickFirstContactId(trustB); // from B perspective, this is A

  console.log("\nA sees contact userId (B):", CONTACT_ID_FOR_A);
  console.log("B sees contact userId (A):", CONTACT_ID_FOR_B);

  logStep("3) Ensure visibility enabled both directions");
  const visA = await apiJson("/api/visibility/set", {
    token: A.accessToken,
    method: "POST",
    body: { viewerUserId: CONTACT_ID_FOR_A, canView: true },
  });
  const visB = await apiJson("/api/visibility/set", {
    token: B.accessToken,
    method: "POST",
    body: { viewerUserId: CONTACT_ID_FOR_B, canView: true },
  });

  console.log("A allows B:", JSON.stringify(visA, null, 2));
  console.log("B allows A:", JSON.stringify(visB, null, 2));

  logStep("4) Post a live location ping as B");
  const locB = await apiJson("/api/locations", {
    token: B.accessToken,
    method: "POST",
    body: { lat: 32.2226, lng: -110.9747, accuracyM: 12 },
  });
  console.log("B /api/locations:", JSON.stringify(locB, null, 2));

  logStep("5) Check /api/live/visible as A (should include B)");
  const visibleA = await apiJson("/api/live/visible", { token: A.accessToken });
  console.log("A /api/live/visible:", JSON.stringify(visibleA, null, 2));

  const usersA = Array.isArray(visibleA?.users) ? visibleA.users : [];
  const foundB = usersA.some((u) => u?.userId === CONTACT_ID_FOR_A);

  if (!foundB) {
    console.error("\n❌ FAIL: A cannot see B in /api/live/visible");
    console.error("Check:");
    console.error("- B posted /api/locations within last ~90 seconds");
    console.error("- Both visibility toggles are true");
    console.error("- Trust is accepted both directions");
    process.exit(1);
  }

  console.log("\n✅ PASS: A can see B in /api/live/visible");

  if (TEST_BIDIRECTIONAL) {
    logStep("6) Optional: Post a live location ping as A");
    const locA = await apiJson("/api/locations", {
      token: A.accessToken,
      method: "POST",
      body: { lat: 32.2230, lng: -110.9752, accuracyM: 10 },
    });
    console.log("A /api/locations:", JSON.stringify(locA, null, 2));

    logStep("7) Optional: Check /api/live/visible as B (should include A)");
    const visibleB = await apiJson("/api/live/visible", { token: B.accessToken });
    console.log("B /api/live/visible:", JSON.stringify(visibleB, null, 2));

    const usersB = Array.isArray(visibleB?.users) ? visibleB.users : [];
    const foundA = usersB.some((u) => u?.userId === CONTACT_ID_FOR_B);

    if (!foundA) {
      console.error("\n❌ FAIL: B cannot see A in /api/live/visible");
      process.exit(1);
    }

    console.log("\n✅ PASS: B can see A in /api/live/visible");
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("\nFAILED:", e?.message ?? e);
  process.exit(1);
});