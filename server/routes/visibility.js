const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const visibilityRouter = Router();

// POST /api/visibility/set { viewerUserId, canView }
visibilityRouter.post("/set", requireUser, async (req, res) => {
  try {
    const viewerUserId = String(req.body?.viewerUserId ?? "");
    const canView = Boolean(req.body?.canView);

    if (!viewerUserId) return res.status(400).json({ error: "viewerUserId is required" });
    if (viewerUserId === req.userId) return res.status(400).json({ error: "viewerUserId cannot be self" });

    // Enforce trust accepted
    const trust = await supabaseAdmin
      .from("trusted_contacts")
      .select("status")
      .eq("requester_user_id", req.userId)
      .eq("requested_user_id", viewerUserId)
      .maybeSingle();

    if (trust.error) return res.status(500).json({ error: trust.error.message });
    if (!trust.data || trust.data.status !== "accepted") {
      return res.status(403).json({ error: "Not trusted/accepted" });
    }

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("live_visibility")
      .upsert(
        {
          owner_user_id: req.userId,
          viewer_user_id: viewerUserId,
          can_view: canView,
          updated_at: now,
        },
        { onConflict: "owner_user_id,viewer_user_id" }
      )
      .select("owner_user_id, viewer_user_id, can_view, updated_at")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, visibility: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { visibilityRouter };
