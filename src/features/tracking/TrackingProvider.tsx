// src/features/tracking/TrackingProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useShares } from "@/src/features/shares/SharesProvider";
import { API_BASE_URL } from "@/src/lib/api";
import { sendEmergencyAlert } from "@/src/lib/sendEmergencyAlert";
import { readJson, writeJson } from "@/src/lib/storage";
import {
  BACKGROUND_LOCATION_TASK,
  setBackgroundTaskMode,
} from "@/src/lib/backgroundLocationTask";
import { BackgroundPermissionModal } from "./BackgroundPermissionModal";

type TrackingMode = "idle" | "active" | "emergency";
export type TrackingFrequency = number;

export const TRACKING_FREQ_MIN_SEC = 30;
export const TRACKING_FREQ_MAX_SEC = 300;
export const TRACKING_FREQ_STEP_SEC = 5;

type BgPreference = "foreground" | "background" | null;
const BG_PREFERENCE_KEY = "safesteps.tracking.bg.preference";

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
  isBackgroundTracking: boolean;
};

type TrackingActions = {
  setFrequency: (sec: TrackingFrequency) => void;
  startActive: () => Promise<void>;
  stopActive: () => Promise<void>;
  startEmergency: () => Promise<void>;
  stopEmergency: () => Promise<void>;
  pingOnce: () => Promise<void>;
};

const TrackingContext = createContext<(TrackingState & TrackingActions) | null>(
  null
);

function nowMs() {
  return Date.now();
}

async function getForegroundPermissionOrThrow(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission not granted.");
}

async function requestBackgroundPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === "granted";
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
  const {
    endAllLiveShares,
    getActiveShares,
    isLoaded: sharesLoaded,
    activeShareToken,
  } = useShares();

  // ─── Refs (not reactive — no re-render needed) ──────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isBackgroundTrackingRef = useRef(false);
  const bootReconciledRef = useRef(false);
  const activeShareTokenRef = useRef<string | null>(activeShareToken);
  // Stores intent while permission modal is open
  const pendingModeRef = useRef<"active" | "emergency">("active");
  const pendingFreqRef = useRef<number>(60);

  useEffect(() => {
    activeShareTokenRef.current = activeShareToken;
  }, [activeShareToken]);

  // ─── State ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<TrackingMode>("idle");
  const [frequencySec, setFrequencySec] = useState<TrackingFrequency>(60);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasForegroundPermission, setHasForegroundPermission] =
    useState<boolean>(false);
  const [lastFix, setLastFix] = useState<LastFix | null>(null);
  const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [bgPreference, setBgPreference] = useState<BgPreference>(null);

  // ─── Load saved background preference ───────────────────────────────────────
  useEffect(() => {
    readJson<BgPreference>(BG_PREFERENCE_KEY, null).then((pref) => {
      setBgPreference(pref);
    });
  }, []);

  // ─── Dev health check ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!__DEV__) return;
    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((j) =>
        console.log("[API] /health", j, { baseUrl: API_BASE_URL })
      )
      .catch((e) =>
        console.warn("[API] /health failed", String(e), {
          baseUrl: API_BASE_URL,
        })
      );
  }, []);

  // ─── Boot reconciliation: end stale shares from cold restarts ───────────────
  useEffect(() => {
    if (!sharesLoaded) return;
    if (bootReconciledRef.current) return;
    bootReconciledRef.current = true;

    if (mode === "idle") {
      const active = getActiveShares();
      if (active.length > 0) {
        console.log("[Boot] Ending stale live shares after restart", {
          count: active.length,
        });
        void endAllLiveShares();
      }
    }
  }, [sharesLoaded, mode, getActiveShares, endAllLiveShares]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const stopBackgroundTask = async () => {
    if (Platform.OS === "web") return;
    try {
      const running = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (running) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log("[Tracking] background task stopped");
      }
    } catch (e: any) {
      console.warn("[Tracking] stopBackgroundTask error:", e?.message);
    }
    isBackgroundTrackingRef.current = false;
    setIsBackgroundTracking(false);
  };

  const startBackgroundTask = async (
    nextMode: "active" | "emergency",
    freqSec: number
  ): Promise<boolean> => {
    if (Platform.OS === "web") return false;

    try {
      // Stop any running background task before starting a new one
      const running = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
      );
      if (running) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      await setBackgroundTaskMode(nextMode);

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: freqSec * 1000,
        distanceInterval: 0,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle:
            nextMode === "emergency"
              ? "🚨 Emergency mode active"
              : "SafeSteps is tracking your location",
          notificationBody:
            nextMode === "emergency"
              ? "Emergency pings are being sent. Open app to stop."
              : "Open the app to stop tracking.",
          notificationColor:
            nextMode === "emergency" ? "#ff4b5c" : "#3896ff",
        },
      });

      isBackgroundTrackingRef.current = true;
      setIsBackgroundTracking(true);
      console.log("[Tracking] background task started", { nextMode, freqSec });
      return true;
    } catch (e: any) {
      console.error("[Tracking] startBackgroundTask error:", e?.message);
      isBackgroundTrackingRef.current = false;
      setIsBackgroundTracking(false);
      return false;
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

  const pingOnce = async (
    modeOverride?: TrackingMode,
    freqOverride?: TrackingFrequency
  ) => {
    setLastError(null);
    try {
      await ensurePermission();
      const fix = await getOneFix();
      setLastFix({
        lat: fix.lat,
        lng: fix.lng,
        accuracyM: fix.accuracyM,
        timestampMs: fix.timestampMs,
      });

      const effectiveMode = modeOverride ?? mode;
      const result = await sendPing({
        isEmergency: effectiveMode === "emergency",
        ...fix,
      });
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

      if (
        String(msg).toLowerCase().includes("missing access token") ||
        String(msg).includes("401")
      ) {
        stopInterval();
        setMode("idle");
      }
    }
  };

  // Foreground interval-based tracking loop
  const startLoop = async (
    nextMode: TrackingMode,
    nextFrequencySec: TrackingFrequency
  ) => {
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

  const stopPresence = async () => {
    if (!API_BASE_URL) return;
    const token = await getAccessTokenSafe();
    if (!token) return;
    try {
      console.log("[Tracking] stopPresence -> POST /api/presence/stop");
      const res = await fetch(`${API_BASE_URL}/api/presence/stop`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const text = await res.text().catch(() => "");
      console.log("[Tracking] stopPresence <-", res.status, text);
    } catch (e: any) {
      console.warn(
        "[Tracking] stopPresence network error",
        String(e?.message ?? e)
      );
    }
  };

  const stopAll = async () => {
    console.log("[Tracking] stopAll", { modeBefore: mode });
    const prevMode = mode;

    stopInterval();
    await stopBackgroundTask();
    setMode("idle");

    if (prevMode === "active" || prevMode === "emergency") {
      await stopPresence();
      await endAllLiveShares();
    }
  };

  // ─── Core: start tracking after preference is known ───────────────────────────
  const startTrackingWithPreference = async (
    preference: "foreground" | "background",
    targetMode: "active" | "emergency",
    targetFreq: number
  ) => {
    await writeJson(BG_PREFERENCE_KEY, preference).catch(() => {});
    setBgPreference(preference);

    if (preference === "background" && Platform.OS !== "web") {
      const granted = await requestBackgroundPermission();

      if (granted) {
        setMode(targetMode);
        // Immediate foreground ping gives the user instant feedback
        await pingOnce(targetMode, targetFreq);
        const started = await startBackgroundTask(targetMode, targetFreq);
        if (started) return;
        // Background task failed — fall through to foreground
      } else {
        // User denied background permission — remember foreground preference
        await writeJson(BG_PREFERENCE_KEY, "foreground").catch(() => {});
        setBgPreference("foreground");
        Alert.alert(
          "Background permission denied",
          "Tracking will run while the app is open. You can grant background access later in your phone's Settings."
        );
      }
    }

    // Foreground fallback
    await startLoop(targetMode, targetFreq);
  };

  // ─── Public actions ───────────────────────────────────────────────────────────
  const startActive = async () => {
    if (mode === "emergency") return;

    try {
      await ensurePermission();
    } catch {
      Alert.alert(
        "Location permission required",
        "Lume needs foreground location permission to send pings."
      );
      return;
    }

    // First time on native — ask which mode the user wants
    if (bgPreference === null && Platform.OS !== "web") {
      pendingModeRef.current = "active";
      pendingFreqRef.current = frequencySec;
      setShowPermissionModal(true);
      return;
    }

    if (bgPreference === "background" && Platform.OS !== "web") {
      setMode("active");
      await pingOnce("active", frequencySec);
      const started = await startBackgroundTask("active", frequencySec);
      if (!started) await startLoop("active", frequencySec);
    } else {
      await startLoop("active", frequencySec);
    }
  };

  const stopActive = async () => {
    if (mode !== "active") return;
    await stopAll();
  };

  const startEmergency = async () => {
    try {
      await ensurePermission();
    } catch {
      Alert.alert(
        "Location permission required",
        "Lume needs foreground location permission to send emergency pings."
      );
      return;
    }

    const emergencyFreq: TrackingFrequency = 30;

    // If already background tracking, switch the task to emergency mode
    if (isBackgroundTrackingRef.current) {
      setMode("emergency");
      await setBackgroundTaskMode("emergency");
      await startBackgroundTask("emergency", emergencyFreq);
      void sendEmergencyAlert();
      return;
    }

    // First time on native — ask which mode
    if (bgPreference === null && Platform.OS !== "web") {
      pendingModeRef.current = "emergency";
      pendingFreqRef.current = emergencyFreq;
      setShowPermissionModal(true);
      return;
    }

    if (bgPreference === "background" && Platform.OS !== "web") {
      setMode("emergency");
      await pingOnce("emergency", emergencyFreq);
      const started = await startBackgroundTask("emergency", emergencyFreq);
      if (!started) await startLoop("emergency", emergencyFreq);
    } else {
      await startLoop("emergency", emergencyFreq);
    }

    void sendEmergencyAlert();
  };

  const stopEmergency = async () => {
    if (mode !== "emergency") return;
    await stopAll();
  };

  const setFrequency = (sec: TrackingFrequency) => {
    const stepped = quantize(
      clamp(sec, TRACKING_FREQ_MIN_SEC, TRACKING_FREQ_MAX_SEC),
      TRACKING_FREQ_STEP_SEC
    );
    setFrequencySec(stepped);

    if (mode === "active") {
      if (isBackgroundTrackingRef.current) {
        // Restart background task with new frequency
        void startBackgroundTask("active", stepped);
      } else {
        void startLoop("active", stepped);
      }
    }
  };

  // ─── Permission modal handlers ─────────────────────────────────────────────
  const handleChooseForeground = async () => {
    setShowPermissionModal(false);
    const targetMode = pendingModeRef.current;
    const targetFreq = pendingFreqRef.current;
    await startTrackingWithPreference("foreground", targetMode, targetFreq);
    if (targetMode === "emergency") void sendEmergencyAlert();
  };

  const handleChooseBackground = async () => {
    setShowPermissionModal(false);
    const targetMode = pendingModeRef.current;
    const targetFreq = pendingFreqRef.current;
    await startTrackingWithPreference("background", targetMode, targetFreq);
    if (targetMode === "emergency") void sendEmergencyAlert();
  };

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(
    () => () => {
      stopInterval();
      void stopBackgroundTask();
    },
    []
  );

  const isRunning = mode !== "idle";

  const value = useMemo(
    () => ({
      mode,
      frequencySec,
      isRunning,
      lastPingAt,
      lastError,
      hasForegroundPermission,
      lastFix,
      isBackgroundTracking,
      setFrequency,
      startActive,
      stopActive,
      startEmergency,
      stopEmergency,
      pingOnce: () => pingOnce(),
    }),
    [
      mode,
      frequencySec,
      isRunning,
      lastPingAt,
      lastError,
      hasForegroundPermission,
      lastFix,
      isBackgroundTracking,
      bgPreference,
    ]
  );

  return (
    <TrackingContext.Provider value={value}>
      {children}
      <BackgroundPermissionModal
        visible={showPermissionModal}
        onChooseForeground={handleChooseForeground}
        onChooseBackground={handleChooseBackground}
      />
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error("useTracking must be used within a TrackingProvider");
  return ctx;
}
