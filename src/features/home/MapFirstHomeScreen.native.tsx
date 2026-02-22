// src/features/home/MapFirstHomeScreen.native.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
    // If not authed, don’t poll (trusted live markers are authed-only)
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

      // Don’t render myself as an “other” marker (you already have blue-dot)
      const others = myUserId ? users.filter((u) => u.userId !== myUserId) : users;

      setVisibleUsers(others);
      setLastUpdatedIso(new Date().toISOString());
      setErrorMsg(null);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load live users");
    } finally {
      setIsFirstLoad(false);
    }
  }, [accessToken, myUserId]);

  // ✅ Poll while this screen is focused
  useFocusEffect(
    useCallback(() => {
      let alive = true;

      // immediate fetch on focus
      fetchVisible();

      const id = setInterval(() => {
        if (!alive) return;
        fetchVisible();
      }, 5000);

      return () => {
        alive = false;
        clearInterval(id);
      };
    }, [fetchVisible])
  );

  const statusText = useMemo(() => {
    if (!accessToken) return "Sign in to see trusted live markers";
    if (errorMsg) return `Live feed error`;
    if (isFirstLoad) return "Loading live feed…";
    return `${visibleUsers.length} visible`;
  }, [accessToken, errorMsg, isFirstLoad, visibleUsers.length]);

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

      {/* TOP OVERLAY */}
      <View pointerEvents="box-none" style={[styles.topRow, { top: insets.top + 10 }]}>
        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>⚙️</Text>
        </Pressable>

        <View style={styles.centerPill}>
          <Text style={styles.centerPillText}>SafeSteps</Text>
          <Text style={styles.centerPillCaret}>▾</Text>
        </View>

        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
      </View>

      {/* LIVE FEED STATUS */}
      <View pointerEvents="none" style={[styles.statusPill, { top: insets.top + 62 }]}>
        <Text style={styles.statusText}>
          {statusText}
          {lastUpdatedIso ? ` • ${new Date(lastUpdatedIso).toLocaleTimeString()}` : ""}
        </Text>
        {errorMsg ? <Text style={styles.statusError}>{errorMsg}</Text> : null}
      </View>

      {/* FLOATING ACTION SURFACE */}
      <BottomActionDrawer tabBarHeight={tabBarHeight} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  topRow: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconText: { fontSize: 16 },

  centerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  centerPillText: { fontSize: 18, fontWeight: "900", color: "rgba(0,0,0,0.88)" },
  centerPillCaret: { fontSize: 14, color: "rgba(0,0,0,0.45)", marginTop: 2 },

  statusPill: {
    position: "absolute",
    left: 14,
    right: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statusText: { color: "rgba(0,0,0,0.85)", fontWeight: "800" },
  statusError: { color: "#b00020", fontWeight: "700" },
});