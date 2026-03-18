// src/features/home/MapFirstHomeScreen.native.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";

import BottomActionDrawer from "@/src/features/home/components/BottomActionDrawer";
import { useTracking } from "@/src/features/tracking/TrackingProvider";
import { API_BASE_URL } from "@/src/lib/api";
import { useAuth } from "@/src/features/auth/AuthProvider";

type LiveVisibleUser = {
  userId: string;
  lat: number;
  lng: number;
  accuracyM: number | null;
  mode: "active" | "emergency";
  updatedAt: string;
  expiresAt: string;
  displayName: string | null;
  email: string | null;
};

export default function MapFirstHomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const mapRef = useRef<MapView>(null);

  const { mode, lastFix } = useTracking();
  const { session, user } = useAuth() as any;

  // ✅ Only show/follow *your* blue dot when tracking is actually running
  const allowMapLocation = mode === "active" || mode === "emergency";

  // Neutral initial region (does not require permissions)
  const DEFAULT_REGION: Region = useMemo(
    () => ({
      latitude: 32.2226,
      longitude: -110.9747,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    []
  );

  // ✅ Live visibility polling state
  const [visibleUsers, setVisibleUsers] = useState<LiveVisibleUser[]>([]);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [lastUpdatedIso, setLastUpdatedIso] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const accessToken: string | null = session?.access_token ?? null;
  const myUserId: string | null = user?.id ?? null;
  const prevAllowRef = useRef<boolean>(allowMapLocation);
  const inFlightRef = useRef(false);

  const [boostPollUntil, setBoostPollUntil] = useState<number>(0);
  const lastCountRef = useRef<number>(0);

  // ✅ Emergency status pill pulse animation (opacity only — native driver safe)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (mode === "emergency") {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.55, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [mode, pulseAnim]);

  // ✅ When tracking turns on (and we have a fix), center on it.
  useEffect(() => {
    if (!allowMapLocation) return;
    if (!lastFix) return;

    mapRef.current?.animateToRegion(
      {
        latitude: lastFix.lat,
        longitude: lastFix.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      350
    );
  }, [allowMapLocation, lastFix]);

  const fetchVisible = useCallback(async () => {
    // If not authed, don't poll (trusted live markers are authed-only)
    if (!accessToken) {
      setVisibleUsers([]);
      setLastUpdatedIso(null);
      setErrorMsg(null);
      setIsFirstLoad(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/live/visible`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`live/visible ${res.status}: ${txt || res.statusText}`);
      }

      const json = (await res.json()) as { users?: LiveVisibleUser[] };
      const users = Array.isArray(json.users) ? json.users : [];

      // Don't render myself as an "other" marker (you already have blue-dot)
      const others = myUserId ? users.filter((u) => u.userId !== myUserId) : users;
      const nextCount = others.length;
      if (nextCount !== lastCountRef.current) {
        setBoostPollUntil(Date.now() + 12_000);
        lastCountRef.current = nextCount;
      }
      setVisibleUsers(others);
      setLastUpdatedIso(new Date().toISOString());
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load live users");
    } finally {
      setIsFirstLoad(false);
    }
  }, [accessToken, myUserId, API_BASE_URL]);

  useEffect(() => {
    const prev = prevAllowRef.current;
    const now = allowMapLocation;

    if (!prev && now) {
      // tracking just turned ON
      setBoostPollUntil(Date.now() + 12_000);
      fetchVisible();
    }

    prevAllowRef.current = now;
  }, [allowMapLocation, fetchVisible]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let t: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        if (!alive) return;
        if (!accessToken || !allowMapLocation) {
          // when idle or signed out, slow/no polling
          const nextDelay = 5000;
          t = setTimeout(tick, nextDelay);
          return;
        }
        // ✅ prevent overlap
        if (inFlightRef.current) {
          const boosted = Date.now() < boostPollUntil;
          const nextDelay = boosted ? 1000 : 5000;
          t = setTimeout(tick, nextDelay);
          return;
        }

        inFlightRef.current = true;
        try {
          await fetchVisible();
        } finally {
          inFlightRef.current = false;
        }

        const boosted = Date.now() < boostPollUntil;
        const nextDelay = boosted ? 1000 : 5000;
        t = setTimeout(tick, nextDelay);
      };

      tick();

      return () => {
        alive = false;
        if (t) clearTimeout(t);
      };
    }, [fetchVisible, boostPollUntil, accessToken, allowMapLocation])
  );

  // Status pill — derives label, border, background, and text color from mode
  const modeLabel =
    mode === "emergency"
      ? "EMERGENCY ACTIVE"
      : mode === "active"
      ? "Sharing location"
      : "Location private";

  const modePillBorderColor =
    mode === "emergency" ? "#ff3b4e" : mode === "active" ? "#3896ff" : "#1a2035";

  const modePillBg =
    mode === "emergency" ? "rgba(58,10,16,0.92)" : "rgba(5,8,20,0.78)";

  const modePillTextColor =
    mode === "emergency" ? "#ff3b4e" : mode === "active" ? "#e7ecff" : "#a6b1cc";

  const modeDotColor = mode === "emergency" ? "#ff3b4e" : "#3896ff";

  const contactCount = visibleUsers.length;

  return (
    <View style={styles.root}>
      {/* MAP BASE LAYER */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        pitchEnabled
        rotateEnabled
        zoomEnabled
        scrollEnabled
        toolbarEnabled={false}
        showsUserLocation={allowMapLocation}
        followsUserLocation={allowMapLocation}
        showsMyLocationButton={allowMapLocation}
      >
        {/* ✅ Render trusted live users */}
        {visibleUsers.map((u) => {
          const label = u.displayName || u.email || "Trusted contact";
          return (
            <Marker
              key={u.userId}
              coordinate={{ latitude: u.lat, longitude: u.lng }}
              title={label}
              description={u.mode === "emergency" ? "Emergency" : "Live"}
            />
          );
        })}
      </MapView>

      {/* TOP OVERLAY ROW */}
      <View pointerEvents="box-none" style={[styles.topRow, { top: insets.top + 10 }]}>
        {/* Settings icon */}
        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>⚙️</Text>
        </Pressable>

        {/* Mode status pill — replaces static "SafeSteps ▾" center pill */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.modePill,
            {
              backgroundColor: modePillBg,
              borderColor: modePillBorderColor,
              opacity: mode === "emergency" ? pulseAnim : 1,
            },
          ]}
        >
          {mode !== "idle" && (
            <View style={[styles.modeDot, { backgroundColor: modeDotColor }]} />
          )}
          <Text style={[styles.modePillText, { color: modePillTextColor }]}>
            {modeLabel}
          </Text>
        </Animated.View>

        {/* Notifications icon */}
        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
      </View>

      {/* CONTACT VISIBILITY BADGE
          Only rendered when contacts are visible AND tracking is active.
          Never shown in idle — contacts can only see you when you're sharing. */}
      {contactCount > 0 && allowMapLocation && (
        <View
          pointerEvents="none"
          style={[styles.contactBadge, { top: insets.top + 62 }]}
        >
          <View style={styles.contactBadgeDot} />
          <Text style={styles.contactBadgeText}>
            {contactCount} {contactCount === 1 ? "contact" : "contacts"} visible
          </Text>
        </View>
      )}

      {/* FLOATING ACTION SURFACE */}
      <BottomActionDrawer tabBarHeight={tabBarHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Step 1: dark background matches drawer — eliminates white flash
  root: { flex: 1, backgroundColor: "#050814" },

  topRow: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Step 3: dark translucent treatment to match drawer theme
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(5,8,20,0.78)",
    borderWidth: 1,
    borderColor: "#1a2035",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconText: { fontSize: 16 },

  // Step 4: mode status pill — replaces static center pill
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  modeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modePillText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Step 5: compact right-aligned badge replaces full-width status bar
  contactBadge: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(5,8,20,0.78)",
    borderWidth: 1,
    borderColor: "#1a2035",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  contactBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#34d399",
  },
  contactBadgeText: {
    color: "#a6b1cc",
    fontSize: 12,
    fontWeight: "700",
  },
});
