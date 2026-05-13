// server/routes/push.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");
const { validate, schemas } = require("../lib/validate");

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
pushRouter.post("/register", requireUser, validate(schemas.pushRegister), async (req, res) => {
  try {
    const { expoToken, platform } = req.body;
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

    if (process.env.NODE_ENV !== "production") console.log("[push/register] registered token", { userId: req.userId, platform });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[push/register] unexpected error:", e?.message ?? e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { pushRouter };
