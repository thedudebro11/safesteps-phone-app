// server/routes/visibility.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const visibilityRouter = Router();

function parseBooleanStrict(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null; // invalid
}

// POST /api/visibility/set { viewerUserId, canView }
visibilityRouter.post("/set", requireUser, async (req, res) => {
  try {
    const viewerUserId = String(req.body?.viewerUserId ?? "").trim();
    const canView = parseBooleanStrict(req.body?.canView);

    if (!viewerUserId) return res.status(400).json({ error: "viewerUserId is required" });
    if (viewerUserId === req.userId) return res.status(400).json({ error: "viewerUserId cannot be self" });
    if (canView === null) return res.status(400).json({ error: "canView must be a boolean" });

    // Enforce trust accepted
    const trust = await supabaseAdmin
      .from("trusted_contacts")
      .select("status")
      .eq("requester_user_id", req.userId)
      .eq("requested_user_id", viewerUserId)
      .maybeSingle();

    if (trust.error) {
      console.error("trusted_contacts query error (visibility/set):", trust.error);
      return res.status(500).json({ error: trust.error.message });
    }

    if (!trust.data || trust.data.status !== "accepted") {
      return res.status(403).json({ error: "Not trusted/accepted" });
    }

    const now = new Date().toISOString();

    const upserted = await supabaseAdmin
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

    if (upserted.error) {
      console.error("live_visibility upsert error:", upserted.error);
      return res.status(500).json({ error: upserted.error.message });
    }

    return res.json({ ok: true, visibility: upserted.data });
  } catch (e) {
    console.error("POST /api/visibility/set failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { visibilityRouter };