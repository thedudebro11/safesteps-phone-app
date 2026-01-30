import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeTouchEvent,
  ViewStyle,
} from "react-native";

type DiscreteFrequencySliderProps<T extends number> = {
  valueSec: T;
  stopsSec: readonly T[];
  onChange: (nextSec: T) => void;
  formatStopLabel?: (sec: T) => string;
  style?: ViewStyle;
};

type TrackRect = { x: number; width: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function nearestIndex(target: number, arr: readonly number[]) {

  if (arr.length === 0) return 0;
  let bestIdx = 0;
  let bestDist = Math.abs(arr[0] - target);
  for (let i = 1; i < arr.length; i++) {
    const d = Math.abs(arr[i] - target);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

const DEFAULT_FORMAT = (sec: number) => {
  if (sec < 60) return `${sec}s`;
  if (sec % 60 === 0) return `${sec / 60} min`;
  return `${sec}s`;
};

export default function DiscreteFrequencySlider<T extends number>({
  valueSec,
  stopsSec,
  onChange,
  formatStopLabel = DEFAULT_FORMAT as (sec: T) => string,
  style,
}: DiscreteFrequencySliderProps<T>) {

  const trackRef = useRef<View>(null);
  const [trackRect, setTrackRect] = useState<TrackRect | null>(null);

  const selectedIdx = useMemo(() => {
    const idx = stopsSec.indexOf(valueSec);
    if (idx >= 0) return idx;
    return nearestIndex(valueSec, stopsSec);
  }, [valueSec, stopsSec]);

  const percent = useMemo(() => {
    if (stopsSec.length <= 1) return 0;
    return selectedIdx / (stopsSec.length - 1);
  }, [selectedIdx, stopsSec.length]);

  const measureTrack = useCallback(() => {
    // measure in window so we can compare with pageX reliably
    requestAnimationFrame(() => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        if (!width) return;
        setTrackRect({ x, width });
      });
    });
  }, []);

  useEffect(() => {
    // measure on mount and after any re-render that might move it
    measureTrack();
  }, [measureTrack]);

  const onTrackLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      measureTrack();
    },
    [measureTrack]
  );

  const commitFromPageX = useCallback(
    (pageX: number) => {
      if (!trackRect || stopsSec.length === 0) return;

      const PADDING = 10; // inner padding so ends are actually hittable
      const left = trackRect.x + PADDING;
      const right = trackRect.x + trackRect.width - PADDING;
      const x = clamp(pageX, left, right);

      const t = (x - left) / Math.max(1, right - left); // 0..1
      const idxFloat = t * (stopsSec.length - 1);
      const idx = clamp(Math.round(idxFloat), 0, stopsSec.length - 1);

      onChange(stopsSec[idx]);
    },
    [trackRect, stopsSec, onChange]
  );

  const onTrackPress = useCallback(
    (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      commitFromPageX(e.nativeEvent.pageX);
    },
    [commitFromPageX]
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.labelsRow}>
        <Text style={styles.sideLabel}>{formatStopLabel(stopsSec[0] ?? 0)}</Text>
        <Text style={styles.centerLabel}>
          {stopsSec[selectedIdx] ? `Balanced ${formatStopLabel(stopsSec[selectedIdx])}` : "Balanced"}
        </Text>
        <Text style={styles.sideLabel}>
          {formatStopLabel(stopsSec[stopsSec.length - 1] ?? 0)}
        </Text>
      </View>

      <Pressable onPress={onTrackPress} style={styles.trackPressable}>
        <View ref={trackRef} onLayout={onTrackLayout} style={styles.track}>
          {/* Stops */}
          {stopsSec.map((_, i) => {
            const isActive = i === selectedIdx;
            return (
              <View
                key={String(i)}
                style={[
                  styles.stopDot,
                  isActive ? styles.stopDotActive : styles.stopDotInactive,
                  { left: `${(i / Math.max(1, stopsSec.length - 1)) * 100}%` },
                ]}
              />
            );
          })}

          {/* Thumb */}
          <View style={[styles.thumb, { left: `${percent * 100}%` }]} />
        </View>
      </Pressable>

      <View style={styles.hintRow}>
        <Text style={styles.hint}>Less battery</Text>
        <Text style={styles.hint}>More battery</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  labelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sideLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontWeight: "600",
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: "800",
  },
  trackPressable: {
    width: "100%",
  },
  track: {
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    overflow: "hidden",
  },
  stopDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 999,
    top: "50%",
    marginTop: -5,
    marginLeft: -5,
  },
  stopDotActive: {
    backgroundColor: "rgba(56,150,255,0.95)",
  },
  stopDotInactive: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    top: "50%",
    marginTop: -11,
    marginLeft: -11,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  hintRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    opacity: 0.7,
  },
  hint: {
    fontSize: 13,
    fontWeight: "600",
  },
});
