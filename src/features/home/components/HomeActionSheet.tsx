import React, { useMemo, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import DiscreteFrequencySlider from "./DiscreteFrequencySlider";

type Props = {
  frequencySec: number;
  onChangeFrequencySec: (sec: number) => void;

  onPressActiveTracking: () => void;
  onPressEmergency: () => void;
  onPressShare: () => void;

  // optional: show last ping interval or status line
  statusText?: string;
};

const { height: SCREEN_H } = Dimensions.get("window");

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function HomeActionSheet({
  frequencySec,
  onChangeFrequencySec,
  onPressActiveTracking,
  onPressEmergency,
  onPressShare,
  statusText,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // Sheet geometry:
  // - bottom is ALWAYS flush to top of tab bar (no map gap)
  // - translateY animates between collapsed and expanded
  const expandedHeight = Math.min(520, Math.round(SCREEN_H * 0.62));
  const collapsedHeight = 118;

  const maxTranslate = expandedHeight - collapsedHeight; // how far down we can slide (collapsed)
  const translateY = useRef(new Animated.Value(maxTranslate)).current; // start collapsed

  const lastValue = useRef(maxTranslate);

  const snapTo = (to: "expanded" | "collapsed", velocityY = 0) => {
    const target = to === "expanded" ? 0 : maxTranslate;

    Animated.spring(translateY, {
      toValue: target,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
      // velocity helps it feel natural
      velocity: velocityY,
    }).start(() => {
      lastValue.current = target;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) => {
          // require a real vertical intent so we don't steal taps
          return Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        onPanResponderGrant: () => {
          translateY.stopAnimation((v: number) => {
            lastValue.current = v;
          });
        },
        onPanResponderMove: (_evt, gesture) => {
          const next = clamp(lastValue.current + gesture.dy, 0, maxTranslate);
          translateY.setValue(next);
        },
        onPanResponderRelease: (_evt, gesture) => {
          const vy = gesture.vy;
          const dy = gesture.dy;

          // Fast fling wins
          if (vy < -0.6) return snapTo("expanded", Math.abs(vy));
          if (vy > 0.6) return snapTo("collapsed", vy);

          // Otherwise snap by threshold (middle)
          const midpoint = maxTranslate / 2;
          const end = clamp(lastValue.current + dy, 0, maxTranslate);

          if (end <= midpoint) snapTo("expanded", Math.abs(vy));
          else snapTo("collapsed", vy);
        },
      }),
    [maxTranslate, translateY]
  );

  const stopsSec = useMemo(() => [30, 60, 300, 900], []);

  // edge-to-edge; bottom flush to tab bar
  const bottomOffset = tabBarHeight; // tab bar already includes safe-area handling in most setups
  const topRadius = 28;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.sheet,
          {
            height: expandedHeight,
            bottom: bottomOffset,
            transform: [{ translateY }],
            borderTopLeftRadius: topRadius,
            borderTopRightRadius: topRadius,
            paddingBottom: Math.max(14, insets.bottom * 0.25),
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Grabber (still visible, but DRAG is primary) */}
        <View style={styles.grabberWrap}>
          <View style={styles.grabber} />
        </View>

        {/* Top row: 3 primary actions */}
        <View style={styles.row}>
          <Pressable onPress={onPressActiveTracking} style={[styles.btn, styles.btnBlue]}>
            <Text style={styles.btnText}>START{"\n"}ACTIVE{"\n"}TRACKING</Text>
          </Pressable>

          <Pressable onPress={onPressEmergency} style={[styles.btn, styles.btnRed]}>
            <Text style={styles.btnText}>EMERGENCY</Text>
          </Pressable>

          <Pressable onPress={onPressShare} style={[styles.btn, styles.btnPurple]}>
            <Text style={styles.btnText}>SHARE</Text>
          </Pressable>
        </View>

        {/* Second row: Share / Invite (keep if you want both; otherwise remove one) */}
        <View style={styles.row2}>
          <Pressable onPress={onPressShare} style={[styles.btnWide, styles.btnPurpleSoft]}>
            <Text style={styles.btnWideText}>SHARE</Text>
          </Pressable>

          <Pressable onPress={() => {}} style={[styles.btnWide, styles.btnNeutral]}>
            <Text style={styles.btnWideTextDark}>INVITE</Text>
          </Pressable>
        </View>

        {/* Frequency slider */}
        <View style={styles.sliderCard}>
          <DiscreteFrequencySlider
            valueSec={frequencySec}
            stopsSec={stopsSec}
            onChange={onChangeFrequencySec}
            formatStopLabel={(sec) => {
              if (sec < 60) return `${sec}s`;
              if (sec === 60) return "1 min";
              if (sec === 300) return "5 min";
              if (sec === 900) return "15 min";
              return `${Math.round(sec / 60)} min`;
            }}
          />
        </View>

        {/* Status */}
        <View style={styles.status}>
          <Text style={styles.statusTitle}>Emergency</Text>
          <Text style={styles.statusSub}>
            {statusText ?? `Last ping interval ${Math.round(frequencySec / 60)} min`}
          </Text>
        </View>

        {/* IMPORTANT: Removed Contacts/Shares/Membership nav here (redundant) */}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: Platform.OS === "android" ? 12 : 0,
    paddingHorizontal: 16,
  },
  grabberWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 14,
  },
  grabber: {
    width: 58,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    height: 86,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  btnBlue: {
    backgroundColor: "rgba(56,150,255,0.12)",
    borderColor: "rgba(56,150,255,0.35)",
  },
  btnRed: {
    backgroundColor: "rgba(255,80,80,0.12)",
    borderColor: "rgba(255,80,80,0.35)",
  },
  btnPurple: {
    backgroundColor: "rgba(140,120,255,0.12)",
    borderColor: "rgba(140,120,255,0.35)",
  },
  btnText: {
    textAlign: "center",
    fontWeight: "900",
    letterSpacing: 0.3,
    fontSize: 14,
  },
  row2: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  btnWide: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  btnPurpleSoft: {
    backgroundColor: "rgba(140,120,255,0.10)",
    borderColor: "rgba(140,120,255,0.25)",
  },
  btnNeutral: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(0,0,0,0.10)",
  },
  btnWideText: {
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.6,
  },
  btnWideTextDark: {
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.6,
    color: "rgba(0,0,0,0.75)",
  },
  sliderCard: {
    padding: 14,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 14,
  },
  status: {
    alignItems: "center",
    paddingTop: 8,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  statusSub: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    opacity: 0.75,
  },
});
