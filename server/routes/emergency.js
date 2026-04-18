// server/routes/emergency.js
//
// Emergency alert delivery route.
//
// POST /api/emergency/alert
//   Resolves eligible trusted contacts, fetches their push tokens, and sends
//   an emergency push notification via the Expo Push API.
//
// This route does NOT handle POST /api/emergency (the location ping).
// That endpoint remains inline in server/index.js and is unchanged.

const { Router } = require("express");
const { requireUser } = require("../middleware/requireUser");
const { supabaseAdmin } = require("../lib/supabaseAdmin");

const emergencyRouter = Router();

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Notifications sent within this window are deduplicated (no second send).
const DEDUP_WINDOW_MS = 90 * 1000;

// Expo's documented maximum batch size per push request.
const EXPO_CHUNK_SIZE = 100;

/**
 * POST /api/emergency/alert
 *
 * Sends an emergency push notification to the sender's eligible trusted contacts.
 *
 * Eligibility: accepted trust relationship in EITHER direction.
 *   - Contacts the sender invited (requester = sender)
 *   - Contacts who invited the sender (requested = sender)
 *   Both sets are merged and deduplicated before token lookup.
 *
 * live_visibility does NOT gate notification delivery — it only gates
 * location visibility on the map after the recipient opens the app.
 * That gating is enforced by the existing GET /api/live/visible route, unchanged.
 *
 * No coordinates, addresses, or raw location data appear in push payloads.
 *
 * Always returns HTTP 200. Delivery failures are logged server-side.
 * The client's emergency mode continues regardless of this call's outcome.
 */
emergencyRouter.post("/alert", requireUser, async (req, res) => {
  const senderId = req.userId;

  try {
    // ── 1. Deduplication check ──────────────────────────────────────────────
    // Only check against rows that resulted in an actual send (deduped = false).
    // Checking deduplicated records would cause a chain-dedup where rapid re-taps
    // prevent a genuine re-trigger after the 90-second window expires.
    const cutoffIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

    const { data: recentAlert, error: dedupError } = await supabaseAdmin
      .from("emergency_alerts")
      .select("id")
      .eq("sender_user_id", senderId)
      .eq("deduped", false)
      .gt("triggered_at", cutoffIso)
      .limit(1)
      .maybeSingle();

    if (dedupError) {
      // Non-fatal: a dedup query failure should not block the alert from sending.
      console.error("[emergency/alert] dedup query error:", dedupError.message);
    }

    if (recentAlert) {
      // Record the suppressed attempt, then acknowledge cleanly.
      const { error: dedupInsertError } = await supabaseAdmin
        .from("emergency_alerts")
        .insert({ sender_user_id: senderId, recipient_count: 0, deduped: true });
      if (dedupInsertError) {
        console.error("[emergency/alert] dedup record insert error:", dedupInsertError.message);
      }

      console.log("[emergency/alert] deduplicated (within 90s window)", { senderId });
      return res.json({ ok: true, deduplicated: true });
    }

    // ── 2. Resolve eligible recipients across both trust directions ──────────
    // Run both direction queries in parallel for efficiency.
    const [outbound, inbound] = await Promise.all([
      // Direction A: sender sent the trust request → contacts they invited
      supabaseAdmin
        .from("trusted_contacts")
        .select("requested_user_id")
        .eq("requester_user_id", senderId)
        .eq("status", "accepted"),

      // Direction B: sender received the trust request → contacts who invited them
      supabaseAdmin
        .from("trusted_contacts")
        .select("requester_user_id")
        .eq("requested_user_id", senderId)
        .eq("status", "accepted"),
    ]);

    if (outbound.error) {
      console.error("[emergency/alert] outbound trust query error:", outbound.error.message);
    }
    if (inbound.error) {
      console.error("[emergency/alert] inbound trust query error:", inbound.error.message);
    }

    // Merge both directions, deduplicate, exclude sender (defensive).
    const recipientIds = new Set([
      ...(outbound.data ?? []).map((r) => r.requested_user_id),
      ...(inbound.data ?? []).map((r) => r.requester_user_id),
    ]);
    recipientIds.delete(senderId);

    if (recipientIds.size === 0) {
      const { error: noRecipientsInsertError } = await supabaseAdmin
        .from("emergency_alerts")
        .insert({ sender_user_id: senderId, recipient_count: 0, deduped: false });
      if (noRecipientsInsertError) {
        console.error("[emergency/alert] no-recipients record error:", noRecipientsInsertError.message);
      }

      console.log("[emergency/alert] no eligible recipients", { senderId });
      return res.json({ ok: true, recipientCount: 0 });
    }

    // ── 3. Fetch push tokens for eligible recipients ─────────────────────────
    const { data: tokenRows, error: tokenError } = await supabaseAdmin
      .from("push_tokens")
      .select("expo_push_token")
      .in("user_id", Array.from(recipientIds));

    if (tokenError) {
      console.error("[emergency/alert] push_tokens query error:", tokenError.message);
    }

    const tokens = (tokenRows ?? []).map((r) => r.expo_push_token);

    if (tokens.length === 0) {
      const { error: noTokensInsertError } = await supabaseAdmin
        .from("emergency_alerts")
        .insert({ sender_user_id: senderId, recipient_count: 0, deduped: false });
      if (noTokensInsertError) {
        console.error("[emergency/alert] no-tokens record error:", noTokensInsertError.message);
      }

      console.log("[emergency/alert] no registered tokens for recipients", {
        senderId,
        eligibleRecipients: recipientIds.size,
      });
      return res.json({ ok: true, recipientCount: 0 });
    }

    // ── 4. Fetch sender profile for notification copy ────────────────────────
    // display_name preferred; email as fallback; generic string if both missing.
    const { data: senderProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("display_name, email")
      .eq("user_id", senderId)
      .maybeSingle();

    if (profileError) {
      console.error("[emergency/alert] sender profile query error:", profileError.message);
    }

    const senderName =
      senderProfile?.display_name ||
      senderProfile?.email ||
      "Someone you trust";

    // ── 5. Build notification payloads ───────────────────────────────────────
    // No coordinates, no addresses, no raw location data.
    const notificationBody = `${senderName} has activated emergency mode — open Lume to check in.`;

    const messages = tokens.map((token) => ({
      to: token,
      title: "Emergency Alert",
      body: notificationBody,
      sound: "default",
      priority: "high",
      // data payload is available to the app when opened from the notification.
      // "screen" is a hint for future deep-link routing; not wired yet.
      data: { screen: "home" },
    }));

    // ── 6. Send via Expo Push API in chunks ──────────────────────────────────
    // Expo accepts up to EXPO_CHUNK_SIZE messages per request.
    // Delivery failures are logged but do not fail the endpoint.
    for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
      const chunk = messages.slice(i, i + EXPO_CHUNK_SIZE);

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(chunk),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          console.error(
            "[emergency/alert] Expo Push API error:",
            response.status,
            // Truncate to avoid flooding logs with large error bodies.
            text.slice(0, 300)
          );
        }
      } catch (e) {
        console.error(
          "[emergency/alert] Expo Push API fetch error:",
          e?.message ?? String(e)
        );
      }
    }

    // ── 7. Record the alert ──────────────────────────────────────────────────
    // recipient_count = number of tokens dispatched to Expo.
    // Confirmed delivery requires receipt polling (deferred to a future phase).
    const { error: alertInsertError } = await supabaseAdmin
      .from("emergency_alerts")
      .insert({
        sender_user_id: senderId,
        recipient_count: tokens.length,
        deduped: false,
      });
    if (alertInsertError) {
      console.error("[emergency/alert] alert record insert error:", alertInsertError.message);
    }

    console.log("[emergency/alert] sent", {
      senderId,
      eligibleRecipients: recipientIds.size,
      recipientCount: tokens.length,
    });

    return res.json({ ok: true, recipientCount: tokens.length });
  } catch (e) {
    // Unexpected top-level error. Log and return a stable error shape.
    // The client's emergency mode continues regardless of this call's outcome.
    console.error("[emergency/alert] unexpected error:", e?.message ?? String(e));
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
});

module.exports = { emergencyRouter };
