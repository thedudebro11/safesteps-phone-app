import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Resolve API base URL safely for Expo / React Native.
 *
 * Priority:
 * 1) EXPO_PUBLIC_API_BASE_URL
 * 2) Expo host auto-detect from manifest/debug host
 * 3) localhost only for web
 *
 * On native, never silently fall back to localhost.
 * Fail loudly so bad config is obvious.
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  const possibleHosts = [
    // Common Expo locations depending on runtime/version
    (Constants.expoConfig as any)?.hostUri,
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost,
    (Constants as any)?.manifest?.debuggerHost,
  ].filter(Boolean) as string[];

  for (const hostValue of possibleHosts) {
    const host = String(hostValue).split(":")[0];
    if (host) {
      return `http://${host}:3000`;
    }
  }

  if (Platform.OS === "web") {
    return "http://localhost:3000";
  }

  throw new Error(
    "Could not resolve API base URL on native. Set EXPO_PUBLIC_API_BASE_URL in .env."
  );
}

export const API_BASE_URL = getApiBaseUrl();

console.log("[API_BASE_URL]", API_BASE_URL);