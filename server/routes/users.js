// server/routes/users.js
const express = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");
const { validate, schemas } = require("../lib/validate");

const usersRouter = express.Router();

// POST /api/users/lookup { email }
usersRouter.post("/lookup", requireUser, validate(schemas.userLookup), async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, email")
      .eq("email", email)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.json({ exists: false });

    if (data.user_id === req.userId) {
      return res.json({ exists: true, isSelf: true, userId: data.user_id, email: data.email });
    }

    return res.json({
      exists: true,
      userId: data.user_id,
      displayName: data.display_name ?? null,
      email: data.email,
    });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

// POST /api/users/profile { displayName }
usersRouter.post("/profile", requireUser, validate(schemas.profileUpdate), async (req, res) => {
  try {
    const { displayName } = req.body;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ display_name: displayName })
      .eq("user_id", req.userId);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

module.exports = { usersRouter };
