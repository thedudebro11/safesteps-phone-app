// server/routes/live.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const liveRouter = Router();

// GET /api/live/visible
liveRouter.get("/visible", requireUser, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.rpc("get_visible_users", {
      viewer_id: req.userId,
    });

    if (error) {
      console.error("get_visible_users rpc error:", error);
      return res.status(500).json({ error: error.message });
    }

    const rows = data ?? [];

    return res.json({
      users: rows.map((r) => ({
        userId: r.user_id,
        lat: r.lat,
        lng: r.lng,
        accuracyM: r.accuracy_m ?? null,
        mode: r.mode,
        updatedAt: r.updated_at,
        expiresAt: r.expires_at,
        displayName: r.display_name ?? null,
        email: r.email ?? null,
        avatarUrl: r.avatar_url ?? null,
      })),
    });
  } catch (e) {
    console.error("GET /api/live/visible failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { liveRouter };