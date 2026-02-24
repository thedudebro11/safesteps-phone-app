// server/routes/history.js
const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const historyRouter = Router();

/**
 * GET /api/history?from=&to=&mode=
 * - requires auth
 * - defaults to last 24 hours if from/to not provided
 * - optional mode filter: active | emergency
 * - newest first
 * - limit 200
 */
historyRouter.get("/", requireUser, async (req, res) => {
    try {
        const now = new Date();

        const fromQ = String(req.query.from ?? "").trim();
        const toQ = String(req.query.to ?? "").trim();
        const modeQ = String(req.query.mode ?? "").trim().toLowerCase();

        // Defaults: last 24 hours
        const defaultFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        const defaultTo = now.toISOString();

        const fromIso = fromQ ? new Date(fromQ).toISOString() : defaultFrom;
        const toIso = toQ ? new Date(toQ).toISOString() : defaultTo;

        // Validate mode if provided
        const mode = modeQ === "active" || modeQ === "emergency" ? modeQ : null;

        if (modeQ && !mode) {
            return res.status(400).json({ error: "mode must be 'active' or 'emergency'" });
        }

        let q = supabaseAdmin
            .from("location_history")
            .select("id, user_id, lat, lng, accuracy_m, mode, created_at")
            .eq("user_id", req.userId)
            .gte("created_at", fromIso)
            .lte("created_at", toIso)
            .order("created_at", { ascending: false })
            .limit(200);

        if (mode) q = q.eq("mode", mode);

        const { data, error } = await q;
        if (error) {
            console.error("GET /api/history query error:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.json({ items: data ?? [], from: fromIso, to: toIso, mode: mode ?? "all" });
    } catch (e) {
        console.error("GET /api/history failed:", e);
        return res.status(500).json({ error: e?.message ?? "Unknown error" });
    }
});

module.exports = { historyRouter };