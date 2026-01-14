import Constants from "expo-constants";

/**
 * Returns the API base URL for the current runtime.
 *
 * Priority:
 * 1) EXPO_PUBLIC_API_BASE_URL (explicit override; best for prod/dev control)
 * 2) Expo hostUri-based LAN auto-detect (best dev UX in Expo Go)
 * 3) Fallback localhost (mainly for web)
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  // Expo Go dev sessions provide hostUri like "192.168.0.76:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(":")[0];

  if (host) return `http://${host}:3000`;

  // last resort
  return "http://localhost:3000";
}

export const API_BASE_URL = getApiBaseUrl();
