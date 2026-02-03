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

    const STOPS = useMemo(
        () => [30, 60, 300] as const satisfies readonly TrackingFrequency[],
        []
    );

    /**
     * Drawer sizing
     * Height animates. Bottom stays glued.
     */
    const HANDLE_H = 44;          // must match styles.handleZone.height
    const PEEK_CONTENT_H = 14;    // tiny “peek” under the handle (adjust 0–30)
    const COLLAPSED_H = HANDLE_H + PEEK_CONTENT_H;


    // How tall drawer is allowed to become when fully expanded.
    // Keep this under top pills, etc.
    const MAX_HEIGHT = Math.min(
        560,
        screenH - (insets.top + 80) - tabBarHeight
    );

    // Animated height of the drawer (this is the whole trick)
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
                // Drag up => increase height. Drag down => decrease height.
                const next = clamp(
                    lastHeight.current - gesture.dy,
                    COLLAPSED_H,
                    MAX_HEIGHT
                );
                heightRaw.setValue(next);
            },

            onPanResponderRelease: () => {
                heightRaw.stopAnimation((value: number) => {
                    // Free-drag: keep where released (just clamp)
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

    // ✅ formatted to nearest hundredth for minutes
    const frequencyLabel =
        frequencySec < 60 ? `${frequencySec}s` : `${(frequencySec / 60).toFixed(2)} min`;

    return (
        <View
            style={[
                styles.shell,
                {
                    bottom: 0,      // ✅ offset happens HERE (once)
                    height: MAX_HEIGHT,        // ✅ shell reserves the max visual region
                },
            ]}
            pointerEvents="box-none"
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        bottom: 0,               // ✅ DO NOT offset again
                        height: heightRaw,       // ✅ only height animates
                    },
                ]}
            >
                {/* Drag only from the handle */}
                <View style={styles.handleZone} {...panResponder.panHandlers}>
                    <View style={styles.handle} />
                </View>

                {/* ✅ do NOT pad by tabBarHeight here */}
                <View style={[styles.content, { paddingBottom: 16 }]}>
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
                            stepSec={5}
                            showLiveValueLabel
                            formatStopLabel={(sec) =>
                                sec < 60 ? `${sec}s` : `${(sec / 60).toFixed(2)}m`
                            }
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
                                Pings are append-only events. Retries are safe. Emergency overrides all states.
                            </Text>
                        </View>
                    </View>
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
