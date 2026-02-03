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
  PanResponder,
  
} from "react-native";

type DiscreteFrequencySliderProps<T extends number> = {
  // Now supports continuous values (not just stops)
  valueSec: T;

  // Used for “markers” + end labels (min/max are derived from first/last)
  stopsSec: readonly T[];

  onChange: (nextSec: T) => void;

  // Optional formatting
  formatStopLabel?: (sec: T) => string;

  // Step size for quantization (defaults to 5)
  stepSec?: number;

  // Optional: show “Every X” label in center (recommended)
  showLiveValueLabel?: boolean;

  style?: ViewStyle;
};

type TrackRect = { x: number; width: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function quantize(n: number, step: number) {
  if (step <= 0) return n;
  return Math.round(n / step) * step;
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
  stepSec = 5,
  showLiveValueLabel = true,
  style,
}: DiscreteFrequencySliderProps<T>) {
  const trackRef = useRef<View>(null);
  const [trackRect, setTrackRect] = useState<TrackRect | null>(null);

  const minSec = (stopsSec[0] ?? 0) as number;
  const maxSec = (stopsSec[stopsSec.length - 1] ?? 0) as number;

  const percent = useMemo(() => {
    const range = Math.max(1, maxSec - minSec);
    return clamp(((valueSec as number) - minSec) / range, 0, 1);
  }, [valueSec, minSec, maxSec]);

  const measureTrack = useCallback(() => {
    requestAnimationFrame(() => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        if (!width) return;
        setTrackRect({ x, width });
      });
    });
  }, []);

  useEffect(() => {
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
      if (!trackRect) return;

      // inner padding so thumb can reach ends
      const PADDING = 12;
      const left = trackRect.x + PADDING;
      const right = trackRect.x + trackRect.width - PADDING;

      const x = clamp(pageX, left, right);
      const t = (x - left) / Math.max(1, right - left); // 0..1

      const raw = minSec + t * (maxSec - minSec);
      const stepped = quantize(raw, stepSec);

      const next = clamp(stepped, minSec, maxSec);
      onChange(next as T);
    },
    [trackRect, minSec, maxSec, stepSec, onChange]
  );

  const onTrackPress = useCallback(
    (e: NativeSyntheticEvent<NativeTouchEvent>) => {
      commitFromPageX(e.nativeEvent.pageX);
    },
    [commitFromPageX]
  );

  // PanResponder for real dragging
  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: (evt) => {
        commitFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        commitFromPageX(evt.nativeEvent.pageX);
      },
    });
  }, [commitFromPageX]);

  const leftLabel = formatStopLabel((minSec as unknown) as T);
  const rightLabel = formatStopLabel((maxSec as unknown) as T);

  const liveLabel = useMemo(() => {
    if (!showLiveValueLabel) return "";
    return `Every ${formatStopLabel(valueSec)}`;
  }, [showLiveValueLabel, valueSec, formatStopLabel]);

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.labelsRow}>
        <Text style={styles.sideLabel}>{leftLabel}</Text>
        <Text style={styles.centerLabel}>{showLiveValueLabel ? liveLabel : "Balanced"}</Text>
        <Text style={styles.sideLabel}>{rightLabel}</Text>
      </View>

      <Pressable onPress={onTrackPress} style={styles.trackPressable}>
        <View
          ref={trackRef}
          onLayout={onTrackLayout}
          style={styles.track}
          {...panResponder.panHandlers}
        >
          {/* Optional stop markers (visual guidance) */}
          {stopsSec.map((_, i) => {
            const p = stopsSec.length <= 1 ? 0 : i / (stopsSec.length - 1);
            return (
              <View
                key={String(i)}
                style={[styles.stopDot, styles.stopDotInactive, { left: `${p * 100}%` }]}
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
    color: "#aab3d6",
  },
  centerLabel: {
    fontSize: 16,
    fontWeight: "900",
    color: "#e7ecff",
  },
  trackPressable: {
    width: "100%",
  },
  track: {
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
  stopDotInactive: {
    backgroundColor: "rgba(255,255,255,0.10)",
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
    borderColor: "rgba(0,0,0,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  hintRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    opacity: 0.8,
  },
  hint: {
    fontSize: 13,
    fontWeight: "700",
    color: "#aab3d6",
  },
});
