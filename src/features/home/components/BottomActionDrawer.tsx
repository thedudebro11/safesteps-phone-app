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

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

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
    const isIdle = mode === "idle";

    const STOPS = useMemo(
        () => [30, 60, 300] as const satisfies readonly TrackingFrequency[],
        []
    );

    /**
     * Drawer sizing — unchanged from original.
     * Height animates. Bottom stays glued.
     */
    const HANDLE_H = 44;
    const PEEK_CONTENT_H = 14;
    const COLLAPSED_H = HANDLE_H + PEEK_CONTENT_H;

    const MAX_HEIGHT = Math.min(
        560,
        screenH - (insets.top + 80) - tabBarHeight
    );

    const heightRaw = useRef(new Animated.Value(COLLAPSED_H)).current;
    const lastHeight = useRef(COLLAPSED_H);

    // Always start collapsed (fixes fast refresh / retained Animated.Value)
    useEffect(() => {
        heightRaw.setValue(COLLAPSED_H);
        lastHeight.current = COLLAPSED_H;
    }, [heightRaw, COLLAPSED_H]);

    const settleHeight = (toValue: number) => {
        const finalVal = clamp(toValue, COLLAPSED_H, MAX_HEIGHT);
        lastHeight.current = finalVal;

        Animated.timing(heightRaw, {
            toValue: finalVal,
            duration: 90,
            useNativeDriver: false, // height can't use native driver
        }).start();
    };

    const panResponder = useMemo(() => {
        return PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => {
                const dy = Math.abs(gesture.dy);
                const dx = Math.abs(gesture.dx);
                return dy > 4 && dy > dx;
            },

            onPanResponderGrant: () => {
                heightRaw.stopAnimation((value: number) => {
                    lastHeight.current = clamp(value, COLLAPSED_H, MAX_HEIGHT);
                });
            },

            onPanResponderMove: (_, gesture) => {
                const next = clamp(
                    lastHeight.current - gesture.dy,
                    COLLAPSED_H,
                    MAX_HEIGHT
                );
                heightRaw.setValue(next);
            },

            onPanResponderRelease: () => {
                heightRaw.stopAnimation((value: number) => {
                    settleHeight(value);
                });
            },
        });
    }, [heightRaw, COLLAPSED_H, MAX_HEIGHT]);

    const safeRun = (fn: () => Promise<void>) => {
        void fn().catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            Alert.alert("Action failed", msg);
        });
    };

    // ─── Action handlers (logic unchanged) ───────────────────────────────────

    const onPressActive = () => {
        safeRun(async () => {
            if (isActive) await stopActive();
            else await startActive();
        });
    };

    const onPressEmergency = () => {
        safeRun(async () => {
            if (isEmergency) await stopEmergency();
            else await startEmergency();
        });
    };

    // ─── Hold-to-cancel emergency ────────────────────────────────────────────
    // useNativeDriver: false because width (layout) cannot use native driver.
    const holdProgress = useRef(new Animated.Value(0)).current;

    const onCancelPressIn = () => {
        Animated.timing(holdProgress, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
        }).start();
    };

    const onCancelPressOut = () => {
        holdProgress.stopAnimation();
        Animated.timing(holdProgress, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const onCancelLongPress = () => {
        holdProgress.setValue(0);
        safeRun(async () => await stopEmergency());
    };

    // ─── Display values ───────────────────────────────────────────────────────

    // Step 2: fixed format — no more "5.00 min"
    const frequencyLabel =
        frequencySec < 60
            ? `${frequencySec}s`
            : `${Math.round(frequencySec / 60)} min`;

    // Step 7: state-aware title
    const drawerTitle = isEmergency
        ? "EMERGENCY ACTIVE"
        : isActive
        ? "Sharing your location"
        : "Your location is private";

    const drawerTitleColor = isEmergency
        ? "#ff3b4e"
        : isActive
        ? "#e7ecff"
        : "#a6b1cc";

    // Frequency sub-label shown when not idle
    const freqSubLabel = isEmergency
        ? "Pinging every 30s · Emergency mode"
        : `Pinging every ${frequencyLabel}`;

    // Step 8: state-aware top accent border
    const topBorderColor = isEmergency
        ? "#ff3b4e"
        : isActive
        ? "#3896ff"
        : "transparent";

    // Hold-to-cancel fill width interpolation
    const cancelFillWidth = holdProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <View
            style={[
                styles.shell,
                {
                    bottom: 0,
                    height: MAX_HEIGHT,
                },
            ]}
            pointerEvents="box-none"
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        bottom: 0,
                        height: heightRaw,
                        // Step 8: top accent line, overrides borderWidth for top side only
                        borderTopColor: topBorderColor,
                        borderTopWidth: 2,
                    },
                ]}
            >
                {/* Step 10: Emergency red tint overlay — absolutely behind all content */}
                {isEmergency && (
                    <View style={styles.emergencyOverlay} pointerEvents="none" />
                )}

                {/* Drag handle — drag only from this zone */}
                <View style={styles.handleZone} {...panResponder.panHandlers}>
                    <View style={styles.handle} />
                </View>

                <View style={[styles.content, { paddingBottom: 16 }]}>

                    {/* Step 7: State-aware title block */}
                    <View style={styles.titleBlock}>
                        <Text style={[styles.title, { color: drawerTitleColor }]}>
                            {drawerTitle}
                        </Text>
                        {/* Frequency sub-label — only when tracking is running */}
                        {!isIdle && (
                            <Text style={styles.freqSubLabel}>{freqSubLabel}</Text>
                        )}
                    </View>

                    {/* ─── IDLE + ACTIVE: vertical primary/secondary button stack ─── */}
                    {/* Step 6: primary CTA — full width, state-aware label and style */}
                    {!isEmergency && (
                        <Pressable
                            onPress={onPressActive}
                            style={[
                                styles.primaryBtn,
                                isActive ? styles.primaryBtnStop : styles.primaryBtnStart,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.primaryBtnText,
                                    isActive ? styles.primaryBtnTextStop : styles.primaryBtnTextStart,
                                ]}
                            >
                                {isActive ? "Stop Sharing" : "Start Sharing"}
                            </Text>
                        </Pressable>
                    )}

                    {/* Step 6: secondary emergency button — full width, below primary.
                        Active state gets a filled dark background so it reads as more
                        serious than just an outlined button next to Stop Sharing. */}
                    {!isEmergency && (
                        <Pressable
                            onPress={onPressEmergency}
                            style={[
                                styles.emergencyBtn,
                                isActive ? styles.emergencyBtnActive : styles.emergencyBtnIdle,
                            ]}
                        >
                            <Text style={styles.emergencyBtnText}>Emergency Alert</Text>
                        </Pressable>
                    )}

                    {/* ─── EMERGENCY: hold-to-cancel replaces normal actions ─── */}
                    {/* Step 12: hold 1.5s to cancel — prevents accidental cancellation */}
                    {isEmergency && (
                        <Pressable
                            onPressIn={onCancelPressIn}
                            onPressOut={onCancelPressOut}
                            onLongPress={onCancelLongPress}
                            delayLongPress={1500}
                            style={styles.cancelBtn}
                        >
                            {/* Progress fill animates from left to right on hold */}
                            <Animated.View
                                style={[styles.cancelFill, { width: cancelFillWidth }]}
                            />
                            <Text style={styles.cancelBtnText}>Hold to Cancel Emergency</Text>
                        </Pressable>
                    )}

                    {/* Step 11: Frequency slider — hidden in emergency (locked at 30s) */}
                    {!isEmergency && (
                        <View style={styles.section}>
                            <View style={styles.sliderHeaderRow}>
                                <Text style={styles.sliderTitle}>Ping frequency</Text>
                                <View style={styles.sliderValuePill}>
                                    <Text style={styles.sliderValueText}>{frequencyLabel}</Text>
                                </View>
                            </View>

                            <DiscreteFrequencySlider
                                valueSec={frequencySec}
                                stopsSec={STOPS}
                                onChange={setFrequency}
                                stepSec={5}
                                showLiveValueLabel
                                // Step 2: consistent format — no toFixed(2)
                                formatStopLabel={(sec) =>
                                    sec < 60 ? `${sec}s` : `${Math.round(sec / 60)} min`
                                }
                            />
                        </View>
                    )}

                    {/* Step 9: Privacy info card — idle state only, no clutter when active */}
                    {isIdle && (
                        <View style={styles.section}>
                            <View style={styles.infoCard}>
                                <Text style={styles.infoTitle}>Privacy-first by default</Text>
                                <Text style={styles.infoBody}>
                                    Your location is only shared when you choose to. Stop at any time.
                                </Text>
                            </View>
                        </View>
                    )}

                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    shell: {
        position: "absolute",
        left: 0,
        right: 0,
    },

    container: {
        position: "absolute",
        left: 0,
        right: 0,
        backgroundColor: "#050814",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        // Left, right, bottom borders — top is overridden inline for the accent
        borderColor: "#1a2035",
        borderWidth: 1,
        overflow: "hidden",
    },

    // Step 10: red tint overlay — absolutely positioned, behind all content
    emergencyOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#3a0a10",
        opacity: 0.45,
    },

    handleZone: {
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        // Transparent so the emergency overlay tint shows through the handle area
        backgroundColor: "transparent",
        zIndex: 1,
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
        zIndex: 1,
    },

    // Step 7: title block replaces the old titleRow + modePill
    titleBlock: {
        marginTop: 4,
        marginBottom: 16,
        gap: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: "800",
    },
    freqSubLabel: {
        color: "#a6b1cc",
        fontSize: 13,
        fontWeight: "600",
    },

    // Step 6: primary action button (Start Sharing / Stop Sharing)
    primaryBtn: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    // Start Sharing: blue fill — positive, inviting
    primaryBtnStart: {
        backgroundColor: "#3896ff",
        borderColor: "#3896ff",
    },
    // Stop Sharing: outlined danger — cautious, not alarming
    primaryBtnStop: {
        backgroundColor: "transparent",
        borderColor: "#ff3b4e",
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: "800",
    },
    primaryBtnTextStart: {
        color: "#ffffff",
    },
    primaryBtnTextStop: {
        color: "#ff3b4e",
    },

    // Step 6: secondary emergency button (shown in idle + active)
    emergencyBtn: {
        width: "100%",
        height: 46,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    // Idle: outlined only — emergency is present but not alarming
    emergencyBtnIdle: {
        backgroundColor: "transparent",
        borderColor: "#ff3b4e",
    },
    // Active: dark filled background — more visually serious alongside Stop Sharing
    emergencyBtnActive: {
        backgroundColor: "#1a0a12",
        borderColor: "#ff3b4e",
    },
    emergencyBtnText: {
        color: "#ff3b4e",
        fontSize: 14,
        fontWeight: "800",
    },

    // Step 12: hold-to-cancel emergency button
    cancelBtn: {
        width: "100%",
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#ff3b4e",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden", // clips progress fill to rounded corners
        marginBottom: 10,
    },
    // Animated fill — width driven by holdProgress (0% → 100%)
    cancelFill: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: "#ff3b4e",
        opacity: 0.3,
    },
    cancelBtnText: {
        color: "#ff3b4e",
        fontSize: 14,
        fontWeight: "800",
    },

    // Frequency slider section
    section: {
        marginTop: 6,
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

    // Step 9: privacy info card — idle only
    infoCard: {
        backgroundColor: "#0c1020",
        borderColor: "#1a2035",
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        marginTop: 6,
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
