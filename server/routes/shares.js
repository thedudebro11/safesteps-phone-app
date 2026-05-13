// server/routes/shares.js
const { Router } = require("express");
const crypto = require("crypto");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");
const { validate, schemas } = require("../lib/validate");

const sharesRouter = Router();

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * POST /api/shares/start
 * Creates a share session in the DB and returns a raw token to the client.
 * Only the SHA-256 hash is stored — never the raw token.
 */
sharesRouter.post("/start", requireUser, validate(schemas.sharesStart), async (req, res) => {
  const { reason, contactUserId } = req.body;
  const userId = req.userId;

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("share_sessions")
      .insert({
        user_id: userId,
        status: "active",
        reason,
        contact_id: contactUserId ?? null,
        started_at: new Date().toISOString(),
      })
      .select("id, status, reason, started_at")
      .single();

    if (sessionError) {
      console.error("[shares/start] session insert error:", sessionError.message);
      return res.status(500).json({ error: sessionError.message });
    }

    const rawToken = generateToken();
    const tokenHash = sha256(rawToken);

    const { error: recipientError } = await supabaseAdmin
      .from("share_recipients")
      .insert({
        user_id: userId,
        share_session_id: session.id,
        contact_user_id: contactUserId ?? null,
        token_hash: tokenHash,
        status: "active",
      });

    if (recipientError) {
      console.error("[shares/start] recipient insert error:", recipientError.message);
      // Clean up the session row since we couldn't create the recipient
      await supabaseAdmin.from("share_sessions").delete().eq("id", session.id);
      return res.status(500).json({ error: recipientError.message });
    }

    // Return raw token to client — it will never be stored again
    return res.json({ ok: true, token: rawToken, sessionId: session.id, session });
  } catch (e) {
    console.error("[shares/start] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * POST /api/shares/end
 * Ends a share session by session ID.
 */
sharesRouter.post("/end", requireUser, validate(schemas.sharesEnd), async (req, res) => {
  const { sessionId } = req.body;
  const userId = req.userId;

  try {
    const { data, error } = await supabaseAdmin
      .from("share_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("id, status")
      .single();

    if (error) {
      console.error("[shares/end] update error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: "Session not found or not owned by you" });
    }

    await supabaseAdmin
      .from("share_recipients")
      .update({ status: "expired" })
      .eq("share_session_id", sessionId)
      .eq("status", "active");

    return res.json({ ok: true, session: data });
  } catch (e) {
    console.error("[shares/end] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * GET /api/shares/active
 * Lists the caller's active share sessions with recipient count.
 */
sharesRouter.get("/active", requireUser, async (req, res) => {
  const userId = req.userId;

  try {
    const { data, error } = await supabaseAdmin
      .from("share_sessions")
      .select("id, status, reason, started_at, expires_at, contact_id, contact_snapshot")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[shares/active] query error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ sessions: data ?? [] });
  } catch (e) {
    console.error("[shares/active] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * GET /api/shares/:token/status
 * Viewer polls to check if a share is still live.
 * Looks up by SHA-256(token) — raw token is never stored.
 */
sharesRouter.get("/:token/status", async (req, res) => {
  const rawToken = req.params.token;
  if (!rawToken || rawToken.length < 10) {
    return res.status(400).json({ error: "invalid_token" });
  }

  const hash = sha256(rawToken);

  try {
    const { data, error } = await supabaseAdmin
      .from("share_recipients")
      .select("status, share_sessions(status, expires_at, reason)")
      .eq("token_hash", hash)
      .maybeSingle();

    if (error) {
      console.error("[shares/status] query error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    if (!data) return res.status(404).json({ error: "not_found" });

    const sessionStatus = data.share_sessions?.status ?? "unknown";
    const isLive =
      data.status === "active" &&
      sessionStatus === "active" &&
      (!data.share_sessions?.expires_at || new Date(data.share_sessions.expires_at) > new Date());

    return res.json({
      ok: true,
      live: isLive,
      recipientStatus: data.status,
      sessionStatus,
      expiresAt: data.share_sessions?.expires_at ?? null,
      reason: data.share_sessions?.reason ?? null,
    });
  } catch (e) {
    console.error("[shares/status] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * Validates an incoming guest share token against the DB.
 * Used by the guest ping path in server/index.js.
 * Returns { ok: true } or calls res.status(403).json() and returns { ok: false }.
 */
async function validateGuestShareToken(req, res, rawToken) {
  if (!rawToken || typeof rawToken !== "string") {
    res.status(403).json({ error: "share_required" });
    return { ok: false };
  }

  const hash = sha256(rawToken);

  const { data, error } = await supabaseAdmin
    .from("share_recipients")
    .select("status, share_sessions(status)")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !data) {
    res.status(403).json({ error: "invalid_share" });
    return { ok: false };
  }

  if (data.status !== "active" || data.share_sessions?.status !== "active") {
    res.status(403).json({ error: "share_ended" });
    return { ok: false };
  }

  return { ok: true };
}

module.exports = { sharesRouter, validateGuestShareToken };
