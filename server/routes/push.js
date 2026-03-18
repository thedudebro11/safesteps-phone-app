// server/routes/push.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const pushRouter = Router();

/**
 * POST /api/push/register
 *
 * Registers (or refreshes) an Expo push token for the authenticated user.
 * Safe to call repeatedly — upserts on (user_id, expo_push_token), so duplicate
 * calls only update updated_at. Multiple devices per user are supported.
 *
 * Body: { expoToken: string, platform: "ios" | "android" }
 */
pushRouter.post("/register", requireUser, async (req, res) => {
  try {
    const { expoToken, platform } = req.body ?? {};

    if (!expoToken || typeof expoToken !== "string") {
      return res.status(400).json({ error: "expoToken is required" });
    }

    if (!platform || !["ios", "android"].includes(platform)) {
      return res.status(400).json({ error: "platform must be 'ios' or 'android'" });
    }

    // Expo push tokens always start with "ExponentPushToken["
    if (!expoToken.startsWith("ExponentPushToken[")) {
      return res.status(400).json({ error: "Invalid Expo push token format" });
    }

    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert(
        {
          user_id: req.userId,
          expo_push_token: expoToken,
          platform,
          updated_at: now,
        },
        { onConflict: "user_id,expo_push_token" }
      );

    if (error) {
      console.error("[push/register] upsert error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log("[push/register] registered token", { userId: req.userId, platform });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[push/register] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { pushRouter };
