// src/lib/notify.ts
import { Platform } from "react-native";

export async function tryLocalNotify(title: string, body: string): Promise<boolean> {
  // No notifications on web in this helper.
  if (Platform.OS === "web") return false;

  try {
    // Dynamic import so this is optional (won’t break builds if not installed)
    const Notifications = await import("expo-notifications").then((m) => m.default ?? m);

    // Don’t prompt here (avoid annoyance). Only notify if already granted.
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null, // fire immediately
    });

    return true;
  } catch {
    return false;
  }
}
