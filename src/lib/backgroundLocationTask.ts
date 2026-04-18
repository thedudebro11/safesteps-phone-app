// src/lib/backgroundLocationTask.ts
//
// Defines the background location task for expo-task-manager.
// MUST be imported in app/_layout.tsx before any navigation renders
// so the task is registered on app startup.
//
// This file runs in the React Native JS context. The OS calls the task
// callback with fresh location data even when the app is backgrounded.

import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { Platform } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { API_BASE_URL } from "@/src/lib/api";
import { readJson, writeJson } from "@/src/lib/storage";

export const BACKGROUND_LOCATION_TASK = "safesteps-background-location";

const BG_MODE_KEY = "safesteps.bg.mode";

export async function setBackgroundTaskMode(
  mode: "active" | "emergency"
): Promise<void> {
  await writeJson(BG_MODE_KEY, mode).catch(() => {});
}

// Only register on native — expo-task-manager is not supported on web.
if (Platform.OS !== "web") {
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }: any) => {
      if (error) {
        console.error("[BGTask] location error:", error.message);
        return;
      }
      if (!data) return;

      const { locations } = data as { locations: Location.LocationObject[] };
      const loc = locations?.[0];
      if (!loc) return;

      try {
        const mode = await readJson<"active" | "emergency">(
          BG_MODE_KEY,
          "active"
        );

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token ?? null;

        if (!token) {
          console.warn("[BGTask] no auth token — skipping ping");
          return;
        }

        const endpoint =
          mode === "emergency" ? "/api/emergency" : "/api/locations";

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracyM: loc.coords.accuracy ?? null,
            altitudeM: loc.coords.altitude ?? null,
            headingDeg: loc.coords.heading ?? null,
            speedMps: loc.coords.speed ?? null,
            timestampMs: loc.timestamp,
          }),
        });

        if (res.ok) {
          console.log("[BGTask] ping ok", { mode });
        } else {
          const text = await res.text().catch(() => "");
          console.warn("[BGTask] ping failed", res.status, text.slice(0, 100));
        }
      } catch (e: any) {
        console.error("[BGTask] unexpected error:", e?.message ?? String(e));
      }
    }
  );
}
