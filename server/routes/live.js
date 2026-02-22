const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const liveRouter = Router();

// GET /api/live/visible
liveRouter.get("/visible", requireUser, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("live_presence")
      .select("user_id, lat, lng, accuracy_m, updated_at, mode, expires_at")
      .gt("expires_at", nowIso);

    if (error) return res.status(500).json({ error: error.message });

    const liveUserIds = (data ?? []).map((r) => r.user_id);
    if (liveUserIds.length === 0) return res.json({ users: [] });

    const allowed = await supabaseAdmin
      .from("live_visibility")
      .select("owner_user_id")
      .eq("viewer_user_id", req.userId)
      .eq("can_view", true)
      .in("owner_user_id", liveUserIds);

    if (allowed.error) return res.status(500).json({ error: allowed.error.message });

    const allowedOwnerIds = new Set((allowed.data ?? []).map((r) => r.owner_user_id));

    const trusted = await supabaseAdmin
      .from("trusted_contacts")
      .select("requested_user_id")
      .eq("requester_user_id", req.userId)
      .eq("status", "accepted")
      .in("requested_user_id", Array.from(allowedOwnerIds));

    if (trusted.error) return res.status(500).json({ error: trusted.error.message });

    const trustedIds = new Set((trusted.data ?? []).map((r) => r.requested_user_id));

    const visible = (data ?? [])
      .filter((p) => allowedOwnerIds.has(p.user_id))
      .filter((p) => trustedIds.has(p.user_id));

    const profiles = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", visible.map((v) => v.user_id));

    if (profiles.error) return res.status(500).json({ error: profiles.error.message });

    const profileMap = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));

    return res.json({
      users: visible.map((p) => ({
        userId: p.user_id,
        lat: p.lat,
        lng: p.lng,
        accuracyM: p.accuracy_m ?? null,
        mode: p.mode,
        updatedAt: p.updated_at,
        expiresAt: p.expires_at,
        displayName: profileMap.get(p.user_id)?.display_name ?? null,
        email: profileMap.get(p.user_id)?.email ?? null,
      })),
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { liveRouter };
