// server/index.js



const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log("[env]", {
  SUPABASE_URL: !!process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const express = require("express");
const cors = require("cors");
const { supabaseAdmin, supabaseAuth } = require("./lib/supabaseAdmin");

const app = express();
app.use(cors());
app.use(express.json());
const { usersRouter } = require("./routes/users");


const { trustRouter } = require("./routes/trust");
const { visibilityRouter } = require("./routes/visibility");
const { liveRouter } = require("./routes/live");

app.use("/api/users", usersRouter);
app.use("/api/trust", trustRouter);
app.use("/api/visibility", visibilityRouter);
app.use("/api/live", liveRouter);



// Set REQUIRE_AUTH=true if you want to force auth even in dev.
const REQUIRE_AUTH = String(process.env.REQUIRE_AUTH || "").toLowerCase() === "true";

/**
 * In-memory dev store (fine for local).
 * Later swap with DB tables.
 */
const sharesByToken = new Map(); // token -> { token, status, blocked, reason, createdAt, endedAt }
const lastPingByKey = new Map(); // key -> timestampMs

function requireBearer(req, res, next) {
  if (!REQUIRE_AUTH) return next(); // dev default: allow

  const auth = req.headers.authorization || "";
  const ok = auth.startsWith("Bearer ") && auth.length > "Bearer ".length;
  if (!ok) return res.status(401).json({ error: "Missing Bearer token" });
  next();
}

function getAuthHeader(req) {
  return (req.headers.authorization || "").trim();
}

function rateLimitByKey(key, minSeconds) {
  const now = Date.now();
  const last = lastPingByKey.get(key) || 0;
  const minMs = minSeconds * 1000;

  if (now - last < minMs) {
    const waitMs = minMs - (now - last);
    return { ok: false, waitMs };
  }

  lastPingByKey.set(key, now);
  return { ok: true };
}

function requireGuestShare(req, res, { minSeconds }) {
  const auth = getAuthHeader(req);
  const { isGuest, shareToken } = req.body || {};

  // If Authorization exists, treat as authed path (skip guest gating)
  if (auth && auth.startsWith("Bearer ")) {
    return { ok: true, mode: "authed" };
  }

  // Guest path: must prove an active share exists
  if (!isGuest || !shareToken) {
    return res.status(403).json({ error: "share_required" });
  }

  const share = sharesByToken.get(shareToken);
  if (!share || share.status !== "live") {
    return res.status(403).json({ error: "invalid_share" });
  }
  if (share.blocked) {
    return res.status(403).json({ error: "share_blocked" });
  }

  // Rate limit by shareToken (and optionally IP backstop)
  const rl = rateLimitByKey(`share:${shareToken}`, minSeconds);
  if (!rl.ok) {
    return res.status(429).json({ error: "rate_limited", waitMs: rl.waitMs });
  }

  return { ok: true, mode: "guest", share };
}

app.get("/health", (req, res) => res.json({ ok: true }));

async function getUserIdFromBearer(req) {
  const auth = (req.headers.authorization || "").trim();
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return data.user.id;
}

async function upsertLivePresence({ userId, lat, lng, accuracyM, mode }) {
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 90_000).toISOString();

  const { error } = await supabaseAdmin.from("live_presence").upsert(
    {
      user_id: userId,
      lat,
      lng,
      accuracy_m: accuracyM ?? null,
      mode,
      updated_at: nowIso,
      expires_at: expiresAt,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(error.message);
}


/**
 * Register a share token as "live".
 * Client should call this right after createShareForContact() creates a token.
 */
app.post("/api/shares/start", (req, res) => {
  const { token, reason } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "missing_token" });
  }

  const existing = sharesByToken.get(token);
  const next = existing
    ? { ...existing, status: "live", blocked: false, reason: reason || existing.reason }
    : { token, status: "live", blocked: false, reason: reason || "manual", createdAt: new Date().toISOString() };

  sharesByToken.set(token, next);
  return res.json({ ok: true, share: next });
});

app.post("/api/shares/end", (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "missing_token" });

  const share = sharesByToken.get(token);
  if (!share) return res.status(404).json({ error: "not_found" });

  const ended = { ...share, status: "ended", endedAt: new Date().toISOString() };
  sharesByToken.set(token, ended);
  return res.json({ ok: true, share: ended });
});

app.post("/api/shares/:token/block", (req, res) => {
  const token = req.params.token;
  const share = sharesByToken.get(token);
  if (!share) return res.status(404).json({ error: "not_found" });

  const blocked = { ...share, blocked: true };
  sharesByToken.set(token, blocked);
  return res.json({ ok: true, share: blocked });
});

app.post("/api/locations", async (req, res) => {
  const auth = getAuthHeader(req);

  // Authed path: write live_presence
  if (auth && auth.startsWith("Bearer ")) {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const { lat, lng, accuracyM } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat/lng required" });
    }

    await upsertLivePresence({ userId, lat, lng, accuracyM, mode: "active" });
    return res.status(200).json({ ok: true, accepted: true, mode: "authed" });
  }

  // Guest path (existing behavior)
  const gate = requireGuestShare(req, res, { minSeconds: 60 });
  if (!gate || gate.ok !== true) return;

  return res.status(200).json({ ok: true, accepted: true, mode: gate.mode });
});


app.post("/api/emergency", async (req, res) => {
  const auth = getAuthHeader(req);

  if (auth && auth.startsWith("Bearer ")) {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const { lat, lng, accuracyM } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat/lng required" });
    }

    await upsertLivePresence({ userId, lat, lng, accuracyM, mode: "emergency" });
    return res.status(200).json({ ok: true, accepted: true, mode: "authed" });
  }

  const gate = requireGuestShare(req, res, { minSeconds: 30 });
  if (!gate || gate.ok !== true) return;

  return res.status(200).json({ ok: true, accepted: true, mode: gate.mode });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SafeSteps dev API listening on http://localhost:${PORT}`);
  console.log(`   REQUIRE_AUTH=${REQUIRE_AUTH ? "true" : "false"}`);
});
