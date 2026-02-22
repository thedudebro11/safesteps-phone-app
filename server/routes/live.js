// server/routes/live.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const liveRouter = Router();

// GET /api/live/visible
liveRouter.get("/visible", requireUser, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();

    // 1) Get currently-live presence
    const presence = await supabaseAdmin
      .from("live_presence")
      .select("user_id, lat, lng, accuracy_m, updated_at, mode, expires_at")
      .gt("expires_at", nowIso);

    if (presence.error) {
      console.error("live_presence query error:", presence.error);
      return res.status(500).json({ error: presence.error.message });
    }

    const liveRows = presence.data ?? [];
    const liveUserIds = liveRows.map((r) => r.user_id);

    if (liveUserIds.length === 0) return res.json({ users: [] });

    // 2) Visibility: who has allowed *me* (viewer) to see them (owner)
    const allowed = await supabaseAdmin
      .from("live_visibility")
      .select("owner_user_id")
      .eq("viewer_user_id", req.userId)
      .eq("can_view", true)
      .in("owner_user_id", liveUserIds);

    if (allowed.error) {
      console.error("live_visibility query error:", allowed.error);
      return res.status(500).json({ error: allowed.error.message });
    }

    const allowedOwnerIds = new Set((allowed.data ?? []).map((r) => r.owner_user_id));
    if (allowedOwnerIds.size === 0) return res.json({ users: [] });

    // 3) Trust: only show owners that are trusted (accepted)
    const trusted = await supabaseAdmin
      .from("trusted_contacts")
      .select("requested_user_id")
      .eq("requester_user_id", req.userId)
      .eq("status", "accepted")
      .in("requested_user_id", Array.from(allowedOwnerIds));

    if (trusted.error) {
      console.error("trusted_contacts query error:", trusted.error);
      return res.status(500).json({ error: trusted.error.message });
    }

    const trustedIds = new Set((trusted.data ?? []).map((r) => r.requested_user_id));
    if (trustedIds.size === 0) return res.json({ users: [] });

    // 4) Filter presence rows to only visible people
    const visible = liveRows
      .filter((p) => allowedOwnerIds.has(p.user_id))
      .filter((p) => trustedIds.has(p.user_id));

    if (visible.length === 0) return res.json({ users: [] });

    // 5) Attach profile info
    const profiles = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", visible.map((v) => v.user_id));

    if (profiles.error) {
      console.error("profiles query error:", profiles.error);
      return res.status(500).json({ error: profiles.error.message });
    }

    const profileMap = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));

    return res.json({
      users: visible.map((p) => {
        const prof = profileMap.get(p.user_id);
        return {
          userId: p.user_id,
          lat: p.lat,
          lng: p.lng,
          accuracyM: p.accuracy_m ?? null,
          mode: p.mode,
          updatedAt: p.updated_at,
          expiresAt: p.expires_at,
          displayName: prof?.display_name ?? null,
          email: prof?.email ?? null,
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/live/visible failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { liveRouter };