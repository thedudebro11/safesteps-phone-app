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

// GET /api/live/debug — shows exactly what each table has for the calling user
liveRouter.get("/debug", requireUser, async (req, res) => {
  const viewerId = req.userId;

  const [presenceAll, visibility, trustOut, trustIn, rpcResult] = await Promise.all([
    supabaseAdmin.from("live_presence").select("*"),
    supabaseAdmin.from("live_visibility").select("*").or(`owner_user_id.eq.${viewerId},viewer_user_id.eq.${viewerId}`),
    supabaseAdmin.from("trusted_contacts").select("*").eq("requester_user_id", viewerId),
    supabaseAdmin.from("trusted_contacts").select("*").eq("requested_user_id", viewerId),
    supabaseAdmin.rpc("get_visible_users", { viewer_id: viewerId }),
  ]);

  return res.json({
    viewerId,
    live_presence: presenceAll.data ?? [],
    live_visibility: visibility.data ?? [],
    trust_sent_by_me: trustOut.data ?? [],
    trust_sent_to_me: trustIn.data ?? [],
    rpc_result: rpcResult.data ?? [],
    rpc_error: rpcResult.error ?? null,
  });
});

module.exports = { liveRouter };