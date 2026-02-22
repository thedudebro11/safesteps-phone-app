// src/features/tracking/TrackingProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useShares } from "@/src/features/shares/SharesProvider";
import { API_BASE_URL } from "@/src/lib/api";

type TrackingMode = "idle" | "active" | "emergency";
export type TrackingFrequency = number;

export const TRACKING_FREQ_MIN_SEC = 30;
export const TRACKING_FREQ_MAX_SEC = 300;
export const TRACKING_FREQ_STEP_SEC = 5;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function quantize(n: number, step: number) {
  if (step <= 0) return n;
  return Math.round(n / step) * step;
}

type LastFix = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  timestampMs: number;
};

type TrackingState = {
  mode: TrackingMode;
  frequencySec: TrackingFrequency;
  isRunning: boolean;
  lastPingAt: number | null;
  lastError: string | null;
  hasForegroundPermission: boolean;
  lastFix: LastFix | null;
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

function nowMs() {
  return Date.now();
}

async function getForegroundPermissionOrThrow(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted.");
}

async function getAccessTokenSafe(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function getOneFix() {
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
  const { endAllLiveShares, getActiveShares, isLoaded: sharesLoaded, activeShareToken } = useShares();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const activeShareTokenRef = useRef<string | null>(activeShareToken);
  const bootReconciledRef = useRef(false);

  useEffect(() => {
    activeShareTokenRef.current = activeShareToken;
  }, [activeShareToken]);

  useEffect(() => {
    if (!__DEV__) return;
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((j) => console.log("[API] /health", j, { baseUrl: API_BASE_URL }))
      .catch((e) => console.warn("[API] /health failed", String(e), { baseUrl: API_BASE_URL }));
  }, []);

  const [mode, setMode] = useState<TrackingMode>("idle");
  const [frequencySec, setFrequencySec] = useState<TrackingFrequency>(60);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState<boolean>(false);
  const [lastFix, setLastFix] = useState<LastFix | null>(null);

  useEffect(() => {
    if (!sharesLoaded) return;
    if (bootReconciledRef.current) return;
    bootReconciledRef.current = true;

    if (mode === "idle") {
      const active = getActiveShares();
      if (active.length > 0) {
        console.log("[Boot] Ending stale live shares after restart", { count: active.length });
        void endAllLiveShares();
      }
    }
  }, [sharesLoaded, mode, getActiveShares, endAllLiveShares]);

  const isRunning = mode !== "idle";

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
    if (!API_BASE_URL) throw new Error("Missing API_BASE_URL");

    const endpoint = payload.isEmergency ? "/api/emergency" : "/api/locations";

    const token = await getAccessTokenSafe();
    if (!token) throw new Error("Missing access token (sign in required)");

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

    return res.json().catch(() => ({}));
  };

  const pingOnce = async (modeOverride?: TrackingMode, freqOverride?: TrackingFrequency) => {
    setLastError(null);

    try {
      await ensurePermission();

      const fix = await getOneFix();
      setLastFix({ lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, timestampMs: fix.timestampMs });

      const effectiveMode = modeOverride ?? mode;
      const result = await sendPing({ isEmergency: effectiveMode === "emergency", ...fix });

      setLastPingAt(nowMs());

      console.log("[Tracking] Ping OK", {
        mode: effectiveMode,
        frequencySec: freqOverride ?? frequencySec,
        result,
      });
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Unknown tracking error";
      setLastError(msg);
      console.warn("[Tracking] Ping failed", msg);

      // If they got signed out or token expired, stop loop immediately.
      if (String(msg).toLowerCase().includes("missing access token") || String(msg).includes("401")) {
        stopInterval();
        setMode("idle");
      }
    }
  };

  const startLoop = async (nextMode: TrackingMode, nextFrequencySec: TrackingFrequency) => {
    stopInterval();

    const safeFreq = quantize(
      clamp(nextFrequencySec, TRACKING_FREQ_MIN_SEC, TRACKING_FREQ_MAX_SEC),
      TRACKING_FREQ_STEP_SEC
    );

    setMode(nextMode);
    await pingOnce(nextMode, safeFreq);

    intervalRef.current = setInterval(() => {
      void pingOnce(nextMode, safeFreq);
    }, safeFreq * 1000);
  };

  const stopAll = async () => {
    const prevMode = mode;
    stopInterval();
    setMode("idle");

    if (prevMode === "active" || prevMode === "emergency") {
      await endAllLiveShares();
    }
  };

  const startActive = async () => {
    if (mode === "emergency") return;

    try {
      await ensurePermission();
      await startLoop("active", frequencySec);
    } catch {
      Alert.alert("Location permission required", "Lume needs foreground location permission to send pings.");
    }
  };

  const stopActive = async () => {
    if (mode !== "active") return;
    await stopAll();
  };

  const startEmergency = async () => {
    try {
      await ensurePermission();
      const emergencyFreq: TrackingFrequency = 30;
      await startLoop("emergency", emergencyFreq);
    } catch {
      Alert.alert("Location permission required", "Lume needs foreground location permission to send emergency pings.");
    }
  };

  const stopEmergency = async () => {
    if (mode !== "emergency") return;
    await stopAll();
  };

  const setFrequency = (sec: TrackingFrequency) => {
    const stepped = quantize(clamp(sec, TRACKING_FREQ_MIN_SEC, TRACKING_FREQ_MAX_SEC), TRACKING_FREQ_STEP_SEC);
    setFrequencySec(stepped);

    if (mode === "active") {
      void startLoop("active", stepped);
    }
  };

  useEffect(() => () => stopInterval(), []);

  const value = useMemo(
    () => ({
      mode,
      frequencySec,
      isRunning,
      lastPingAt,
      lastError,
      hasForegroundPermission,
      lastFix,
      setFrequency,
      startActive,
      stopActive,
      startEmergency,
      stopEmergency,
      pingOnce: () => pingOnce(),
    }),
    [mode, frequencySec, isRunning, lastPingAt, lastError, hasForegroundPermission, lastFix]
  );

  return <TrackingContext.Provider value={value}>{children}</TrackingContext.Provider>;
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within a TrackingProvider");
  return ctx;
}