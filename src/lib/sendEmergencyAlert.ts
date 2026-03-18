// src/lib/sendEmergencyAlert.ts
//
// Fire-and-forget helper for triggering the backend emergency alert endpoint.
// Called once per emergency activation from TrackingProvider.startEmergency().
//
// Never throws. All failures are logged quietly and discarded.
// The caller does not await this — emergency tracking runs regardless of outcome.

import { apiFetch } from "@/src/lib/apiClient";

export async function sendEmergencyAlert(): Promise<void> {
  try {
    await apiFetch("/api/emergency/alert", {
      method: "POST",
      auth: true,
    });
    console.log("[EmergencyAlert] Sent successfully");
  } catch (e) {
    console.warn(
      "[EmergencyAlert] Failed to send (non-fatal):",
      e instanceof Error ? e.message : String(e)
    );
  }
}