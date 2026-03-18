// src/lib/registerPushToken.ts
//
// Registers the current device's Expo push token with the SafeSteps backend.
//
// Behaviour:
//   - No-op on web (web push is out of scope for this phase).
//   - No-op on simulators/emulators (push tokens are only valid on physical devices).
//   - Requests notification permission if not already granted. If the user declines,
//     registration is skipped silently — no error is surfaced.
//   - All failures are caught and logged. This function never throws. Calling code
//     can fire-and-forget it without affecting app startup or the auth flow.
//
// Called once per sign-in / app hydration from AuthProvider.
// Safe to call more than once — the backend upserts on (user_id, expo_push_token).

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { apiFetch } from "@/src/lib/apiClient";

export async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;

  if (!Device.isDevice) {
    console.log("[PushToken] Skipping — not a physical device (simulator/emulator)");
    return;
  }

  // Skip noisy unsupported path in Expo Go on Android
  const isExpoGo = Constants.appOwnership === "expo";
  if (Platform.OS === "android" && isExpoGo) {
    console.log("[PushToken] Skipping — Expo Go on Android does not support remote push registration");
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PushToken] Notification permission not granted — skipping registration");
      return;
    }

    const projectId =
      (Constants.expoConfig?.extra as Record<string, any> | undefined)?.eas?.projectId ??
      undefined;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const expoToken = tokenResult.data;
    const platform = Platform.OS as "ios" | "android";

    await apiFetch("/api/push/register", {
      method: "POST",
      auth: true,
      json: { expoToken, platform },
    });

    console.log("[PushToken] Registered successfully", { platform });
  } catch (e) {
    console.warn(
      "[PushToken] Registration failed (non-fatal):",
      e instanceof Error ? e.message : String(e)
    );
  }
}