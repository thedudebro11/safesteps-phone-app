// src/features/home/MapFirstHomeScreen.native.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import BottomActionDrawer from "@/src/features/home/components/BottomActionDrawer";
import { useTracking } from "@/src/features/tracking/TrackingProvider";

export default function MapFirstHomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const mapRef = useRef<MapView>(null);

  const { mode, lastFix } = useTracking();

  // ✅ Only allow map to show/follow user when tracking is actually running
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

  // ✅ When tracking turns on (and we have a fix), center on it.
  // ✅ When tracking turns off, we do NOT auto-center on the user.
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
        // ✅ HARD GATE location display
        showsUserLocation={allowMapLocation}
        followsUserLocation={allowMapLocation}
        showsMyLocationButton={allowMapLocation}
      >
        {/* Optional: keep your “Tucson marker” (neutral, not user). */}
        
      </MapView>

      {/* TOP OVERLAY */}
      <View pointerEvents="box-none" style={[styles.topRow, { top: insets.top + 10 }]}>
        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>⚙️</Text>
        </Pressable>

        <Pressable style={styles.centerPill}>
          <Text style={styles.centerPillText}>SafeSteps</Text>
          <Text style={styles.centerPillCaret}>▾</Text>
        </Pressable>

        <Pressable style={styles.iconCircle}>
          <Text style={styles.iconText}>🔔</Text>
        </Pressable>
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
});
