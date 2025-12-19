import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

type TrackingMode = "idle" | "active" | "emergency";

type TrackingFrequency = 30 | 60 | 300; // seconds: 30s, 1m, 5m (expand later)

type TrackingState = {
  mode: TrackingMode;
  frequencySec: TrackingFrequency;
  isRunning: boolean;
  lastPingAt: number | null;
  lastError: string | null;
  hasForegroundPermission: boolean;
};

type TrackingActions = {
  setFrequency: (sec: TrackingFrequency) => void;
  startActive: () => Promise<void>;
  stopActive: () => Promise<void>;
  startEmergency: () => Promise<void>;
  stopEmergency: () => Promise<void>;
  pingOnce: () => Promise<void>;
};

const TrackingContext = createContext<(TrackingState & TrackingActions) | null>(null);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";

function nowMs() {
  return Date.now();
}

async function getForegroundPermissionOrThrow(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted.");
  }
}

async function getOneFix() {
  // Balanced defaults. We’ll tune later for battery/accuracy tradeoffs.
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    accuracyM: loc.coords.accuracy ?? null,
    altitudeM: loc.coords.altitude ?? null,
    headingDeg: loc.coords.heading ?? null,
    speedMps: loc.coords.speed ?? null,
    timestampMs: loc.timestamp,
  };
}

export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const { session, isGuest } = useAuth();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<TrackingMode>("idle");
  const [frequencySec, setFrequencySec] = useState<TrackingFrequency>(60);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState<boolean>(false);

  const isRunning = mode !== "idle";

  const accessToken = session?.access_token ?? null;

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const ensurePermission = async () => {
    try {
      await getForegroundPermissionOrThrow();
      setHasForegroundPermission(true);
    } catch (e: any) {
      setHasForegroundPermission(false);
      throw e;
    }
  };

  const sendPing = async (payload: {
    isEmergency: boolean;
    lat: number;
    lng: number;
    accuracyM: number | null;
    altitudeM: number | null;
    headingDeg: number | null;
    speedMps: number | null;
    timestampMs: number;
  }) => {
    // Guest mode is local-only by design. For now, we just log.
    if (isGuest) {
      // eslint-disable-next-line no-console
      console.log("[Tracking] Guest ping (local-only)", payload);
      return;
    }

    if (!API_BASE_URL) {
      // eslint-disable-next-line no-console
      console.warn("[Tracking] Missing EXPO_PUBLIC_API_BASE_URL — ping not sent.");
      return;
    }

    if (!accessToken) {
      // eslint-disable-next-line no-console
      console.warn("[Tracking] Missing access token — ping not sent.");
      return;
    }

    const endpoint = payload.isEmergency ? "/api/emergency" : "/api/locations";

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        lat: payload.lat,
        lng: payload.lng,
        accuracyM: payload.accuracyM,
        altitudeM: payload.altitudeM,
        headingDeg: payload.headingDeg,
        speedMps: payload.speedMps,
        timestampMs: payload.timestampMs,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ping failed (${res.status}): ${text || "Unknown error"}`);
    }
  };

  const pingOnce = async () => {
    setLastError(null);

    try {
      await ensurePermission();

      const fix = await getOneFix();
      const isEmergency = mode === "emergency";

      await sendPing({
        isEmergency,
        ...fix,
      });

      setLastPingAt(nowMs());
      // eslint-disable-next-line no-console
      console.log("[Tracking] Ping OK", { mode, frequencySec, isGuest });
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Unknown tracking error";
      setLastError(msg);
      // eslint-disable-next-line no-console
      console.warn("[Tracking] Ping failed", msg);
    }
  };

  const startLoop = async (nextMode: TrackingMode, nextFrequencySec: TrackingFrequency) => {
    stopInterval();

    // Immediately ping once so UI feels responsive
    setMode(nextMode);
    await pingOnce();

    intervalRef.current = setInterval(() => {
      // Fire-and-forget; internal errors are tracked in state.
      void pingOnce();
    }, nextFrequencySec * 1000);
  };

  const stopAll = async () => {
    stopInterval();
    setMode("idle");
  };

  const startActive = async () => {
    // If emergency is on, active tracking should not override it.
    if (mode === "emergency") return;

    try {
      await ensurePermission();
      await startLoop("active", frequencySec);
    } catch (e: any) {
      Alert.alert("Location permission required", "SafeSteps needs foreground location permission to send pings.");
    }
  };

  const stopActive = async () => {
    if (mode !== "active") return;
    await stopAll();
  };

  const startEmergency = async () => {
    try {
      await ensurePermission();
      // Emergency overrides any active mode and uses a high-frequency baseline.
      // You can tune this later; for v1 this keeps it simple and explicit.
      const emergencyFreq: TrackingFrequency = 30;
      setFrequencySec((prev) => (prev === 30 ? prev : prev)); // keep user selection for active; emergency uses its own internally
      await startLoop("emergency", emergencyFreq);
    } catch (e: any) {
      Alert.alert("Location permission required", "SafeSteps needs foreground location permission to send emergency pings.");
    }
  };

  const stopEmergency = async () => {
    if (mode !== "emergency") return;
    await stopAll();
  };

  const setFrequency = (sec: TrackingFrequency) => {
    setFrequencySec(sec);

    // If active tracking is running, restart loop with new frequency.
    if (mode === "active") {
      void startLoop("active", sec);
    }
    // If emergency is running, we keep emergency frequency fixed at 30s for v1.
  };

  // Safety: stop timers on unmount
  useEffect(() => {
    return () => stopInterval();
  }, []);

  // If user logs out / exits guest, stop tracking to avoid weird states.
  useEffect(() => {
    if (!session?.access_token && !isGuest) {
      stopInterval();
      setMode("idle");
    }
  }, [session?.access_token, isGuest]);

  const value = useMemo(
    () => ({
      mode,
      frequencySec,
      isRunning,
      lastPingAt,
      lastError,
      hasForegroundPermission,
      setFrequency,
      startActive,
      stopActive,
      startEmergency,
      stopEmergency,
      pingOnce,
    }),
    [mode, frequencySec, isRunning, lastPingAt, lastError, hasForegroundPermission]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within a TrackingProvider");
  return ctx;
}
