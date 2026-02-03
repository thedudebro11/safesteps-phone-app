// src/features/home/components/BottomActionDrawer.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import DiscreteFrequencySlider from "@/src/features/home/components/DiscreteFrequencySlider";
import { useTracking, type TrackingFrequency } from "@/src/features/tracking/TrackingProvider";

type Props = {
  tabBarHeight: number;
};

export default function BottomActionDrawer({ tabBarHeight }: Props) {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const {
    mode,
    frequencySec,
    setFrequency,
    startActive,
    stopActive,
    startEmergency,
    stopEmergency,
  } = useTracking();

  const isEmergency = mode === "emergency";
  const isActive = mode === "active";

  /**
   * Keep STOPS a strict subset of TrackingFrequency union.
   * (900 not included unless it's in your union.)
   */
  const STOPS = useMemo(
    () => [30, 60, 300] as const satisfies readonly TrackingFrequency[],
    []
  );

  /**
   * Drawer sizing:
   * - MAX_VISUAL_HEIGHT: full expanded drawer height
   * - PEEK_HEIGHT: amount visible when collapsed
   *
   * IMPORTANT: This drawer is now "free-drag" (no snapping).
   * It will stay where you release it, but it is clamped within bounds.
   */
  const PEEK_HEIGHT = 140; // tweak: 110–170 depending on your taste

  const MAX_VISUAL_HEIGHT = Math.min(
    560,
    screenH - (insets.top + 80) - tabBarHeight
  );

  // translateY bounds
  const MIN_TRANSLATE_Y = 0; // fully expanded
  const MAX_TRANSLATE_Y = clamp(
    MAX_VISUAL_HEIGHT - PEEK_HEIGHT,
    0,
    MAX_VISUAL_HEIGHT
  ); // fully collapsed

  // translateY: 0 = expanded, MAX_TRANSLATE_Y = collapsed
  const translateY = useRef(new Animated.Value(MAX_TRANSLATE_Y)).current;
  const lastTranslateY = useRef(MAX_TRANSLATE_Y);

  // Always start collapsed (beats fast refresh/retained refs)
  useEffect(() => {
    translateY.setValue(MAX_TRANSLATE_Y);
    lastTranslateY.current = MAX_TRANSLATE_Y;
  }, [translateY, MAX_TRANSLATE_Y]);

  // Only used if we need to correct out-of-bounds values (no snapping)
  const settleWithinBounds = (value: number) => {
    const clamped = clamp(value, MIN_TRANSLATE_Y, MAX_TRANSLATE_Y);
    lastTranslateY.current = clamped;

    Animated.timing(translateY, {
      toValue: clamped,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(() => {
    return PanResponder.create({
      // We only attach handlers to the handle zone; still guard intent
      onMoveShouldSetPanResponder: (_, gesture) => {
        const dy = Math.abs(gesture.dy);
        const dx = Math.abs(gesture.dx);
        return dy > 4 && dy > dx;
      },

      onPanResponderGrant: () => {
        translateY.stopAnimation((value: number) => {
          lastTranslateY.current = value;
        });
      },

      onPanResponderMove: (_, gesture) => {
        const next = clamp(
          lastTranslateY.current + gesture.dy,
          MIN_TRANSLATE_Y,
          MAX_TRANSLATE_Y
        );
        translateY.setValue(next);
      },

      onPanResponderRelease: (_, gesture) => {
        // FREE-DRAG behavior:
        // Do NOT snap. Just keep the current position.
        // Only correct if out-of-bounds (or if a very fast fling would push it there).
        translateY.stopAnimation((value: number) => {
          // If user flings hard, allow a tiny inertial nudge but still clamp.
          const inertial = value  // small, controlled
          const finalVal = clamp(inertial, MIN_TRANSLATE_Y, MAX_TRANSLATE_Y);

          // If we didn't change anything meaningful, just store and stop.
          lastTranslateY.current = finalVal;
          Animated.timing(translateY, {
            toValue: finalVal,
            duration: 80,
            useNativeDriver: true,
          }).start();
        });
      },
    });
  }, [MAX_TRANSLATE_Y, MIN_TRANSLATE_Y, translateY]);

  const safeRun = (fn: () => Promise<void>) => {
    void fn().catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Action failed", msg);
    });
  };

  const onPressEmergency = () => {
    safeRun(async () => {
      if (isEmergency) await stopEmergency();
      else await startEmergency();
    });
  };

  const onPressActive = () => {
    safeRun(async () => {
      if (isActive) await stopActive();
      else await startActive();
    });
  };

  const frequencyLabel =
    frequencySec < 60 ? `${frequencySec}s` : `${frequencySec / 60} min`;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: tabBarHeight,
          height: MAX_VISUAL_HEIGHT,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Handle zone is the ONLY draggable region (so slider/buttons work smoothly) */}
      <View style={styles.handleZone} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      <View style={[styles.content, { paddingBottom: tabBarHeight + 16 }]}>
        {/* Header */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Tracking</Text>
          <View
            style={[
              styles.modePill,
              isEmergency
                ? styles.modePillDanger
                : isActive
                ? styles.modePillActive
                : styles.modePillIdle,
            ]}
          >
            <Text style={styles.modePillText}>
              {isEmergency ? "EMERGENCY" : isActive ? "ACTIVE" : "IDLE"}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={onPressEmergency}
            style={[
              styles.bigBtn,
              isEmergency ? styles.bigBtnDanger : styles.bigBtnNeutral,
            ]}
          >
            <Text style={styles.bigBtnText}>
              {isEmergency ? "Stop Emergency" : "Emergency"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onPressActive}
            style={[
              styles.bigBtn,
              isActive ? styles.bigBtnPrimary : styles.bigBtnNeutral,
            ]}
          >
            <Text style={styles.bigBtnText}>
              {isActive ? "Stop Tracking" : "Active Tracking"}
            </Text>
          </Pressable>
        </View>

        {/* Slider */}
        <View style={styles.section}>
          <View style={styles.sliderHeaderRow}>
            <Text style={styles.sliderTitle}>Ping frequency</Text>
            <View style={styles.sliderValuePill}>
              <Text style={styles.sliderValueText}>{frequencyLabel} ping</Text>
            </View>
          </View>

          <DiscreteFrequencySlider
            valueSec={frequencySec}
            stopsSec={STOPS}
            onChange={setFrequency}
            formatStopLabel={(sec) => {
              if (sec < 60) return `${sec}s`;
              return `${sec / 60}m`;
            }}
          />

          <View style={styles.batteryRow}>
            <View style={styles.batterySide}>
              <Text style={styles.batteryIcon}>🔋</Text>
              <Text style={styles.batteryText}>Less battery</Text>
            </View>

            <View style={styles.batterySide}>
              <Text style={styles.batteryText}>More battery</Text>
              <Text style={styles.batteryIcon}>🔋</Text>
            </View>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Privacy-first by default</Text>
            <Text style={styles.infoBody}>
              Pings are append-only events. Retries are safe. Emergency overrides
              all states.
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "#050814",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderColor: "#1a2035",
    borderWidth: 1,
    overflow: "hidden",
  },
  handleZone: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050814",
  },
  handle: {
    width: 48,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#1a2035",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#e7ecff",
    fontSize: 18,
    fontWeight: "800",
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  modePillIdle: {
    backgroundColor: "#0c1020",
    borderColor: "#1a2035",
  },
  modePillActive: {
    backgroundColor: "#0c1020",
    borderColor: "#3896ff",
  },
  modePillDanger: {
    backgroundColor: "#1a0a12",
    borderColor: "#ff4b5c",
  },
  modePillText: {
    color: "#e7ecff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 12,
  },
  bigBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bigBtnNeutral: {
    backgroundColor: "#0c1020",
    borderColor: "#1a2035",
  },
  bigBtnPrimary: {
    backgroundColor: "#0c1020",
    borderColor: "#3896ff",
  },
  bigBtnDanger: {
    backgroundColor: "#1a0a12",
    borderColor: "#ff4b5c",
  },
  bigBtnText: {
    color: "#e7ecff",
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    marginTop: 16,
  },
  sliderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sliderTitle: {
    color: "#e7ecff",
    fontSize: 14,
    fontWeight: "800",
  },
  sliderValuePill: {
    backgroundColor: "#0c1020",
    borderColor: "#1a2035",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sliderValueText: {
    color: "#3896ff",
    fontSize: 13,
    fontWeight: "900",
  },
  batteryRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  batterySide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  batteryIcon: {
    fontSize: 14,
    color: "#aab3d6",
  },
  batteryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#aab3d6",
  },
  infoCard: {
    backgroundColor: "#0c1020",
    borderColor: "#1a2035",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  infoTitle: {
    color: "#e7ecff",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  infoBody: {
    color: "#aab3d6",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
});
