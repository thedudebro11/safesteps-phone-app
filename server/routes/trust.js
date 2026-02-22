// server/routes/trust.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const trustRouter = Router();

/**
 * POST /api/trust/request { targetUserId }
 * - Creates (or upserts) a pending trust request
 * - Smart behavior: if there is already an incoming pending request from target -> me,
 *   auto-accept it and create the reciprocal accepted row.
 */
trustRouter.post("/request", requireUser, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId ?? "").trim();

    if (!targetUserId) return res.status(400).json({ error: "targetUserId is required" });
    if (targetUserId === req.userId) return res.status(400).json({ error: "Cannot request self" });

    // Ensure target exists
    const target = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (target.error) {
      console.error("profiles lookup error (target):", target.error);
      return res.status(500).json({ error: target.error.message });
    }
    if (!target.data) return res.status(404).json({ error: "User not found" });

    // Smart idempotency: if target already requested me and it's pending, accept it now.
    const incomingPending = await supabaseAdmin
      .from("trusted_contacts")
      .select("id, requester_user_id, requested_user_id, status")
      .eq("requester_user_id", targetUserId)
      .eq("requested_user_id", req.userId)
      .eq("status", "pending")
      .maybeSingle();

    if (incomingPending.error) {
      console.error("incomingPending query error:", incomingPending.error);
      return res.status(500).json({ error: incomingPending.error.message });
    }

    if (incomingPending.data) {
      const now = new Date().toISOString();

      // Accept their pending request (target -> me)
      const accepted = await supabaseAdmin
        .from("trusted_contacts")
        .update({ status: "accepted", updated_at: now })
        .eq("id", incomingPending.data.id)
        .select("id, requester_user_id, requested_user_id, status, updated_at")
        .single();

      if (accepted.error) {
        console.error("auto-accept update error:", accepted.error);
        return res.status(500).json({ error: accepted.error.message });
      }

      // Ensure reciprocal accepted row exists (me -> target)
      const reciprocal = await supabaseAdmin.from("trusted_contacts").upsert(
        {
          requester_user_id: req.userId,
          requested_user_id: targetUserId,
          status: "accepted",
          updated_at: now,
        },
        { onConflict: "requester_user_id,requested_user_id" }
      );

      if (reciprocal.error) {
        console.error("auto-accept reciprocal upsert error:", reciprocal.error);
        return res.status(500).json({ error: reciprocal.error.message });
      }

      return res.json({ ok: true, autoAccepted: true, accepted: accepted.data });
    }

    // Normal path: create (or upsert) pending request (me -> target)
    const now = new Date().toISOString();

    const created = await supabaseAdmin
      .from("trusted_contacts")
      .upsert(
        {
          requester_user_id: req.userId,
          requested_user_id: targetUserId,
          status: "pending",
          updated_at: now,
        },
        { onConflict: "requester_user_id,requested_user_id" }
      )
      .select("id, requester_user_id, requested_user_id, status, created_at, updated_at")
      .single();

    if (created.error) {
      console.error("trusted_contacts upsert error (/request):", created.error);
      return res.status(500).json({ error: created.error.message });
    }

    return res.json({ ok: true, request: created.data });
  } catch (e) {
    console.error("POST /api/trust/request failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

// GET /api/trust/requests/incoming
trustRouter.get("/requests/incoming", requireUser, async (req, res) => {
  try {
    const incoming = await supabaseAdmin
      .from("trusted_contacts")
      .select("id, requester_user_id, requested_user_id, status, created_at, updated_at")
      .eq("requested_user_id", req.userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (incoming.error) {
      console.error("incoming requests query error:", incoming.error);
      return res.status(500).json({ error: incoming.error.message });
    }

    return res.json({ requests: incoming.data ?? [] });
  } catch (e) {
    console.error("GET /api/trust/requests/incoming failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

// POST /api/trust/requests/:id/accept
trustRouter.post("/requests/:id/accept", requireUser, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing request id" });

    const existing = await supabaseAdmin
      .from("trusted_contacts")
      .select("id, requester_user_id, requested_user_id, status")
      .eq("id", id)
      .maybeSingle();

    if (existing.error) {
      console.error("accept lookup error:", existing.error);
      return res.status(500).json({ error: existing.error.message });
    }
    if (!existing.data) return res.status(404).json({ error: "Request not found" });
    if (existing.data.requested_user_id !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const now = new Date().toISOString();

    const updated = await supabaseAdmin
      .from("trusted_contacts")
      .update({ status: "accepted", updated_at: now })
      .eq("id", id)
      .select("id, requester_user_id, requested_user_id, status, updated_at")
      .single();

    if (updated.error) {
      console.error("accept update error:", updated.error);
      return res.status(500).json({ error: updated.error.message });
    }

    // Create reciprocal accepted row (me -> requester)
    const reciprocal = await supabaseAdmin.from("trusted_contacts").upsert(
      {
        requester_user_id: req.userId,
        requested_user_id: existing.data.requester_user_id,
        status: "accepted",
        updated_at: now,
      },
      { onConflict: "requester_user_id,requested_user_id" }
    );

    if (reciprocal.error) {
      console.error("accept reciprocal upsert error:", reciprocal.error);
      return res.status(500).json({ error: reciprocal.error.message });
    }

    return res.json({ ok: true, accepted: updated.data });
  } catch (e) {
    console.error("POST /api/trust/requests/:id/accept failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

// POST /api/trust/requests/:id/deny
trustRouter.post("/requests/:id/deny", requireUser, async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    if (!id) return res.status(400).json({ error: "Missing request id" });

    const existing = await supabaseAdmin
      .from("trusted_contacts")
      .select("id, requested_user_id")
      .eq("id", id)
      .maybeSingle();

    if (existing.error) {
      console.error("deny lookup error:", existing.error);
      return res.status(500).json({ error: existing.error.message });
    }
    if (!existing.data) return res.status(404).json({ error: "Request not found" });
    if (existing.data.requested_user_id !== req.userId) return res.status(403).json({ error: "Forbidden" });

    const now = new Date().toISOString();

    const denied = await supabaseAdmin
      .from("trusted_contacts")
      .update({ status: "denied", updated_at: now })
      .eq("id", id);

    if (denied.error) {
      console.error("deny update error:", denied.error);
      return res.status(500).json({ error: denied.error.message });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("POST /api/trust/requests/:id/deny failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

/**
 * GET /api/trust/list
 * Returns accepted contacts + profile + shareEnabled (directional visibility)
 */
trustRouter.get("/list", requireUser, async (req, res) => {
  try {
    const accepted = await supabaseAdmin
      .from("trusted_contacts")
      .select("requested_user_id")
      .eq("requester_user_id", req.userId)
      .eq("status", "accepted");

    if (accepted.error) {
      console.error("trusted_contacts query error (/list):", accepted.error);
      return res.status(500).json({ error: accepted.error.message });
    }

    const contactUserIds = (accepted.data ?? []).map((r) => r.requested_user_id);

    if (contactUserIds.length === 0) {
      return res.json({ contacts: [] });
    }

    const profiles = await supabaseAdmin
      .from("profiles")
      .select("user_id, email, display_name")
      .in("user_id", contactUserIds);

    if (profiles.error) {
      console.error("profiles query error (/list):", profiles.error);
      return res.status(500).json({ error: profiles.error.message });
    }

    const visibility = await supabaseAdmin
      .from("live_visibility")
      .select("viewer_user_id, can_view")
      .eq("owner_user_id", req.userId)
      .in("viewer_user_id", contactUserIds);

    if (visibility.error) {
      console.error("live_visibility query error (/list):", visibility.error);
      return res.status(500).json({ error: visibility.error.message });
    }

    const profileById = new Map((profiles.data ?? []).map((p) => [p.user_id, p]));
    const visibilityByViewer = new Map((visibility.data ?? []).map((v) => [v.viewer_user_id, v.can_view]));

    const contacts = contactUserIds
      .map((userId) => {
        const p = profileById.get(userId);

        // Filter out missing profiles/emails to avoid blank rows in UI
        if (!p?.email) return null;

        return {
          userId,
          email: p.email,
          displayName: p?.display_name ?? null,
          shareEnabled: Boolean(visibilityByViewer.get(userId) ?? false),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const an = (a.displayName ?? "").toLowerCase();
        const bn = (b.displayName ?? "").toLowerCase();
        if (an && bn && an !== bn) return an < bn ? -1 : 1;
        if (an && !bn) return -1;
        if (!an && bn) return 1;

        const ae = (a.email ?? "").toLowerCase();
        const be = (b.email ?? "").toLowerCase();
        if (ae !== be) return ae < be ? -1 : 1;

        return 0;
      });

    return res.json({ contacts });
  } catch (e) {
    console.error("GET /api/trust/list failed:", e);
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { trustRouter };