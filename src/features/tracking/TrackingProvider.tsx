import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import { useShares } from "@/src/features/shares/SharesProvider";
import { API_BASE_URL } from "@/src/lib/api";


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



function nowMs() {
  return Date.now();
}

async function getForegroundPermissionOrThrow(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted.");
  }
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
  const { session, isGuest, hasSession } = useAuth();
  const { endAllLiveShares, activeShareToken } = useShares();


  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isGuestRef = useRef(isGuest);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const activeShareTokenRef = useRef<string | null>(activeShareToken);

  useEffect(() => {
    activeShareTokenRef.current = activeShareToken;
  }, [activeShareToken]);

  useEffect(() => {
    // If auth state says "no session at all", kill tracking immediately.
    // (Prevents stray pings during transitions.)
    if (!hasSession) {
      stopInterval();
      setMode("idle");
    }
  }, [hasSession]);


  useEffect(() => {
    if (!__DEV__) return;

    let cancelled = false;

    fetch(`${API_BASE_URL}/health`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) {
          console.log("[API] /health", j, { baseUrl: API_BASE_URL });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.warn("[API] /health failed", String(e), {
            baseUrl: API_BASE_URL,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    console.log("API_BASE_URL:", API_BASE_URL);
  }, []);



  useEffect(() => {
    isGuestRef.current = isGuest;
  }, [isGuest]);
  useEffect(() => {
    if (isGuest) {
      stopInterval();
      setMode("idle");
    }
  }, [isGuest]);



  const [mode, setMode] = useState<TrackingMode>("idle");
  const [frequencySec, setFrequencySec] = useState<TrackingFrequency>(60);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hasForegroundPermission, setHasForegroundPermission] = useState<boolean>(false);

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
    const isGuestNow = isGuestRef.current;
    const shareToken = activeShareTokenRef.current;

    if (isGuestNow) {
      // ✅ Option B: guest can only send NETWORK pings if a live share exists
      if (!shareToken) {
        console.log("[Tracking] Guest ping blocked (no active share)", payload);
        return { ok: true, guest: true, blocked: "no_active_share" };
      }
    }



    if (!API_BASE_URL) {
      console.warn("[Tracking] Missing API_BASE_URL — ping not sent.");
      throw new Error("Missing API_BASE_URL");
    }


    const endpoint = payload.isEmergency ? "/api/emergency" : "/api/locations";

    // Pull token from Supabase directly to avoid stale session object issues.
    const token = await getAccessTokenSafe();

    if (!token) {
      // eslint-disable-next-line no-console
      console.warn("[Tracking] Missing access token — sending WITHOUT Authorization header (dev).");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          lat: payload.lat,
          lng: payload.lng,
          accuracyM: payload.accuracyM,
          altitudeM: payload.altitudeM,
          headingDeg: payload.headingDeg,
          speedMps: payload.speedMps,
          timestampMs: payload.timestampMs,
          isGuest: isGuestNow,
          shareToken: isGuestNow ? shareToken : null,
        }),
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn("[Tracking] Network error", e?.message ?? e);
      throw e;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ping failed (${res.status}): ${text || "Unknown error"}`);
    }

    const json = await res.json().catch(() => ({}));
    return json;
  };


  const pingOnce = async (modeOverride?: TrackingMode) => {

    setLastError(null);

    try {
      await ensurePermission();

      const fix = await getOneFix();
      const effectiveMode = modeOverride ?? mode;
      const isEmergency = effectiveMode === "emergency";


      const result = await sendPing({ isEmergency, ...fix });
      setLastPingAt(nowMs());
      // eslint-disable-next-line no-console
      console.log("[Tracking] Ping OK", { mode: effectiveMode, frequencySec, isGuest: isGuestRef.current, result });


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
    await pingOnce(nextMode);


    intervalRef.current = setInterval(() => {
      // Fire-and-forget; internal errors are tracked in state.
      void pingOnce(nextMode);
    }, nextFrequencySec * 1000);
  };

  const stopAll = async () => {
    const prevMode = mode; // capture before we change it
    console.log("[Tracking] stopAll", { prevMode: mode });
    stopInterval();
    setMode("idle");

    // If we were actively tracking, kill manual shares too
    if (prevMode === "active") {
      await endAllLiveShares();
    }
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
