// server/index.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const { historyRouter } = require("./routes/history");
const { insertHistoryEvent } = require("./lib/history");
const { usersRouter } = require("./routes/users");
const { trustRouter } = require("./routes/trust");
const { visibilityRouter } = require("./routes/visibility");
const { liveRouter } = require("./routes/live");
const { pushRouter } = require("./routes/push");
const { emergencyRouter } = require("./routes/emergency");
const { sharesRouter, validateGuestShareToken } = require("./routes/shares");
const { validate, schemas } = require("./lib/validate");
const express = require("express");
const cors = require("cors");
const { supabaseAdmin, supabaseAuth } = require("./lib/supabaseAdmin");

const isDev = String(process.env.NODE_ENV || "development").toLowerCase() !== "production";

const app = express();

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:8081", "http://localhost:3000", "http://localhost:19006"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, mobile app, Expo Go native)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/users", usersRouter);
app.use("/api/trust", trustRouter);
app.use("/api/visibility", visibilityRouter);
app.use("/api/live", liveRouter);
app.use("/api/history", historyRouter);
app.use("/api/push", pushRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/shares", sharesRouter);

// ── Helpers ──────────────────────────────────────────────────────────────────

// In-memory rate limiter (per key). Limits rapid duplicate pings from same user.
// Keys reset on restart; this is acceptable — the goal is accidental spam prevention.
const lastPingByKey = new Map();

function rateLimitByKey(key, minSeconds) {
  const now = Date.now();
  const last = lastPingByKey.get(key) || 0;
  const minMs = minSeconds * 1000;

  if (now - last < minMs) {
    return { ok: false, waitMs: minMs - (now - last) };
  }

  lastPingByKey.set(key, now);
  return { ok: true };
}

function getAuthHeader(req) {
  return (req.headers.authorization || "").trim();
}

async function getUserIdFromBearer(req) {
  const auth = getAuthHeader(req);
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

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ ok: true }));

// ── Location ping (active tracking) ─────────────────────────────────────────
app.post("/api/locations", validate(schemas.latLng), async (req, res) => {
  const auth = getAuthHeader(req);

  if (auth && auth.startsWith("Bearer ")) {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const rl = rateLimitByKey(`loc:${userId}`, 10);
    if (!rl.ok) return res.status(429).json({ error: "rate_limited", waitMs: rl.waitMs });

    const { lat, lng, accuracyM } = req.body;
    await upsertLivePresence({ userId, lat, lng, accuracyM, mode: "active" });
    await insertHistoryEvent({ userId, lat, lng, accuracyM, mode: "active" });
    return res.json({ ok: true, accepted: true, mode: "authed" });
  }

  // Guest path: validate share token against DB
  const { shareToken } = req.body || {};
  const result = await validateGuestShareToken(req, res, shareToken);
  if (!result.ok) return;

  return res.json({ ok: true, accepted: true, mode: "guest" });
});

// ── Emergency location ping ──────────────────────────────────────────────────
app.post("/api/emergency", validate(schemas.latLng), async (req, res) => {
  const auth = getAuthHeader(req);

  if (auth && auth.startsWith("Bearer ")) {
    const userId = await getUserIdFromBearer(req);
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const rl = rateLimitByKey(`emergency:${userId}`, 5);
    if (!rl.ok) return res.status(429).json({ error: "rate_limited", waitMs: rl.waitMs });

    const { lat, lng, accuracyM } = req.body;
    await upsertLivePresence({ userId, lat, lng, accuracyM, mode: "emergency" });
    await insertHistoryEvent({ userId, lat, lng, accuracyM, mode: "emergency" });
    return res.json({ ok: true, accepted: true, mode: "authed" });
  }

  const { shareToken } = req.body || {};
  const result = await validateGuestShareToken(req, res, shareToken);
  if (!result.ok) return;

  return res.json({ ok: true, accepted: true, mode: "guest" });
});

// ── Presence stop ────────────────────────────────────────────────────────────
app.post("/api/presence/stop", async (req, res) => {
  const auth = getAuthHeader(req);
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.json({ ok: true, noop: true });
  }

  const userId = await getUserIdFromBearer(req);
  if (!userId) return res.json({ ok: true, noop: true });

  const { error } = await supabaseAdmin.from("live_presence").delete().eq("user_id", userId);
  if (error) {
    console.error("[presence/stop] delete error:", error.message);
  }

  return res.json({ ok: true });
});

// ── Startup ───────────────────────────────────────────────────────────────────
async function checkSupabase() {
  try {
    const { error } = await supabaseAdmin.from("profiles").select("user_id").limit(1);
    if (error) throw error;
    if (isDev) console.log("✅ Supabase connection OK");
  } catch (err) {
    console.error("❌ Supabase connection FAILED:", err.message);
  }
}

checkSupabase();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Lume API listening on port ${PORT}`);
});
