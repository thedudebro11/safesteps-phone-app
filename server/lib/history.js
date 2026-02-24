// server/lib/history.js
const { supabaseAdmin } = require("./supabaseAdmin");

/**
 * Inserts a history event (best effort).
 * Never throws by default (so history can’t break live tracking).
 */
async function insertHistoryEvent({ userId, lat, lng, accuracyM, mode }) {
  try {
    const { error } = await supabaseAdmin.from("location_history").insert({
      user_id: userId,
      lat,
      lng,
      accuracy_m: accuracyM ?? null,
      mode,
      // created_at defaults to now()
    });

    if (error) {
      console.error("[history] insert error:", error);
    }
  } catch (e) {
    console.error("[history] insert exception:", e);
  }
}

module.exports = { insertHistoryEvent };