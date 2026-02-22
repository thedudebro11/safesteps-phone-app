// server/routes/users.js
const express = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const usersRouter = express.Router();

// POST /api/users/lookup { email }
usersRouter.post("/lookup", requireUser, async (req, res) => {
  try {
    const emailRaw = String(req.body?.email || "");
    const email = emailRaw.trim().toLowerCase();

    if (!email) return res.status(400).json({ error: "email is required" });

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

module.exports = { usersRouter };
