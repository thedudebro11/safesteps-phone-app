const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const trustRouter = Router();

// POST /api/trust/request { targetUserId }
trustRouter.post("/request", requireUser, async (req, res) => {
  try {
    const targetUserId = String(req.body?.targetUserId ?? "");

    if (!targetUserId) return res.status(400).json({ error: "targetUserId is required" });
    if (targetUserId === req.userId) return res.status(400).json({ error: "Cannot request self" });

    // Ensure target exists
    const target = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (target.error) return res.status(500).json({ error: target.error.message });
    if (!target.data) return res.status(404).json({ error: "User not found" });

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
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

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true, request: data });
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

// GET /api/trust/requests/incoming
trustRouter.get("/requests/incoming", requireUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("trusted_contacts")
    .select("id, requester_user_id, requested_user_id, status, created_at, updated_at")
    .eq("requested_user_id", req.userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ requests: data ?? [] });
});

// POST /api/trust/requests/:id/accept
trustRouter.post("/requests/:id/accept", requireUser, async (req, res) => {
  const id = req.params.id;

  const existing = await supabaseAdmin
    .from("trusted_contacts")
    .select("id, requester_user_id, requested_user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) return res.status(500).json({ error: existing.error.message });
  if (!existing.data) return res.status(404).json({ error: "Request not found" });
  if (existing.data.requested_user_id !== req.userId) return res.status(403).json({ error: "Forbidden" });

  const now = new Date().toISOString();

  const updated = await supabaseAdmin
    .from("trusted_contacts")
    .update({ status: "accepted", updated_at: now })
    .eq("id", id)
    .select("id, requester_user_id, requested_user_id, status, updated_at")
    .single();

  if (updated.error) return res.status(500).json({ error: updated.error.message });

  // Create reciprocal row (recommended)
  await supabaseAdmin.from("trusted_contacts").upsert(
    {
      requester_user_id: req.userId,
      requested_user_id: existing.data.requester_user_id,
      status: "accepted",
      updated_at: now,
    },
    { onConflict: "requester_user_id,requested_user_id" }
  );

  return res.json({ ok: true, accepted: updated.data });
});

// POST /api/trust/requests/:id/deny
trustRouter.post("/requests/:id/deny", requireUser, async (req, res) => {
  const id = req.params.id;

  const existing = await supabaseAdmin
    .from("trusted_contacts")
    .select("id, requested_user_id")
    .eq("id", id)
    .maybeSingle();

  if (existing.error) return res.status(500).json({ error: existing.error.message });
  if (!existing.data) return res.status(404).json({ error: "Request not found" });
  if (existing.data.requested_user_id !== req.userId) return res.status(403).json({ error: "Forbidden" });

  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("trusted_contacts")
    .update({ status: "denied", updated_at: now })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

module.exports = { trustRouter };
