import React, { useMemo, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
    type ViewStyle,
    type TextStyle,
} from "react-native";
import { router } from "expo-router";
import type {
    PressableStateCallbackType,
    StyleProp
} from "react-native";

import { useTracking } from "@/src/features/tracking/TrackingProvider";
import DiscreteFrequencySlider from "@/src/features/home/components/DiscreteFrequencySlider";

const CARD_BG = "rgba(255,255,255,0.96)";
const BORDER = "rgba(0,0,0,0.08)";
const TXT = "rgba(0,0,0,0.90)";
const SUB = "rgba(0,0,0,0.55)";

const BLUE = "#2F6FED";
const PURPLE = "#7B61FF";
const RED = "#FF4D5A";

type Tone = "neutral" | "primary" | "danger" | "accent";

function SoftButton({
    label,
    tone = "neutral",
    onPress,
    style,
}: {
    label: string;
    tone?: Tone;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
}) {
    const palette = useMemo(() => {
        if (tone === "primary")
            return { bg: "rgba(47,111,237,0.16)", border: "rgba(47,111,237,0.55)", text: BLUE };
        if (tone === "danger")
            return { bg: "rgba(255,77,90,0.16)", border: "rgba(255,77,90,0.65)", text: RED };
        if (tone === "accent")
            return { bg: "rgba(123,97,255,0.16)", border: "rgba(123,97,255,0.55)", text: PURPLE };
        return { bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.10)", text: TXT };
    }, [tone]);

    const pressableStyle = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.softBtn,
        style,
        {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity: pressed ? 0.9 : 1,
        },
    ];

    const textStyle: TextStyle = {
        ...styles.softBtnText,
        color: palette.text,
    };

    return (
        <Pressable onPress={onPress} style={pressableStyle}>
            <Text style={[styles.softBtnText, { color: palette.text }]}>{label}</Text>
        </Pressable>
    );
}

function MiniNavItem({
    icon,
    label,
    onPress,
    active,
}: {
    icon: string;
    label: string;
    onPress: () => void;
    active?: boolean;
}) {
    const pressableStyle = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
        styles.miniNavItem,
        { opacity: pressed ? 0.85 : 1 },
    ];

    return (
        <Pressable onPress={onPress} style={pressableStyle}>
            <Text style={[styles.miniNavIcon, { color: active ? PURPLE : "rgba(0,0,0,0.65)" }]}>{icon}</Text>
            <Text style={[styles.miniNavLabel, { color: active ? PURPLE : "rgba(0,0,0,0.55)" }]}>{label}</Text>
        </Pressable>
    );
}

export function BottomActionDrawer({ tabBarHeight }: { tabBarHeight: number }) {
    const { mode, frequencySec, setFrequency, startActive, startEmergency } = useTracking();

    const [expanded, setExpanded] = useState(false);
    const anim = useRef(new Animated.Value(0)).current;

    const collapsedHeight = 112;
    const expandedHeight = 430;

    const height = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [collapsedHeight, expandedHeight],
    });

    const toggle = () => {
        const next = !expanded;
        setExpanded(next);
        Animated.timing(anim, {
            toValue: next ? 1 : 0,
            duration: 220,
            useNativeDriver: false,
        }).start();
    };

    const thumbPadStyle: ViewStyle = { paddingBottom: tabBarHeight + 10 };
    const STOPS = [30, 60, 300] as const;


    return (
        <Animated.View style={[styles.sheet, thumbPadStyle, { height }]}>
            <Pressable onPress={toggle} style={styles.grabberHit}>
                <View style={styles.grabber} />
            </Pressable>

            {!expanded ? (
                <View style={styles.collapsed}>
                    <View style={styles.quickRow}>
                        <SoftButton
                            label="CONTACTS"
                            tone="neutral"
                            onPress={() => router.push("/(tabs)/contacts")}
                            style={styles.quickBtn}
                        />
                        <SoftButton
                            label="SHARES"
                            tone="accent"
                            onPress={() => router.push("/(tabs)/shares")}
                            style={styles.quickBtn}
                        />
                        <SoftButton
                            label="MEMBERSHIP"
                            tone="neutral"
                            onPress={() => router.push("/(tabs)/membership")}
                            style={styles.quickBtn}
                        />
                    </View>

                    <Text style={styles.hint}>Tap the handle to expand controls</Text>
                </View>
            ) : (
                <View style={styles.expanded}>
                    <View style={styles.row}>
                        <SoftButton label={"Start Active\nTracking"} tone="primary" onPress={startActive} style={styles.bigAction} />
                        <SoftButton label="EMERGENCY" tone="danger" onPress={startEmergency} style={styles.bigAction} />
                        <SoftButton label="Share" tone="accent" onPress={() => router.push("/(tabs)/shares")} style={styles.bigAction} />
                    </View>

                    <View style={styles.row}>
                        <SoftButton label="Share" tone="accent" onPress={() => router.push("/(tabs)/shares")} style={styles.smallAction} />
                        <SoftButton label="Invite" tone="neutral" onPress={() => router.push("/(tabs)/contacts")} style={styles.smallAction} />
                    </View>

                    <DiscreteFrequencySlider
                        valueSec={frequencySec}
                        stopsSec={STOPS}
                        onChange={setFrequency}
                    />



                    <View style={styles.status}>
                        <Text style={styles.statusTitle}>
                            {mode === "emergency" ? "Emergency" : mode === "active" ? "Active" : "Idle"}
                        </Text>
                        <Text style={styles.statusSub}>
                            Last ping interval{" "}
                            <Text style={{ color: TXT, fontWeight: "900" }}>
                                {frequencySec >= 60 ? `${Math.round(frequencySec / 60)} min` : `${frequencySec} sec`}
                            </Text>
                        </Text>
                    </View>

                    <View style={styles.bottomNav}>
                        <MiniNavItem icon="👥" label="Contacts" onPress={() => router.push("/(tabs)/contacts")} />
                        <MiniNavItem icon="🧬" label="Shares" onPress={() => router.push("/(tabs)/shares")} active />
                        <MiniNavItem icon="⭐" label="Membership" onPress={() => router.push("/(tabs)/membership")} />
                    </View>
                </View>
            )}
        </Animated.View>
    );
}

type Styles = {
    sheet: ViewStyle;
    grabberHit: ViewStyle;
    grabber: ViewStyle;

    collapsed: ViewStyle;
    quickRow: ViewStyle;
    quickBtn: ViewStyle;
    hint: TextStyle;

    expanded: ViewStyle;
    row: ViewStyle;

    bigAction: ViewStyle;
    smallAction: ViewStyle;

    softBtn: ViewStyle;
    softBtnText: TextStyle;

    status: ViewStyle;
    statusTitle: TextStyle;
    statusSub: TextStyle;

    bottomNav: ViewStyle;
    miniNavItem: ViewStyle;
    miniNavIcon: TextStyle;
    miniNavLabel: TextStyle;
};

const styles = StyleSheet.create<Styles>({
    sheet: {
        position: "absolute",
        left: 14,
        right: 14,
        bottom: 12,
        borderRadius: 28,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: BORDER,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
    },

    grabberHit: {
        paddingTop: 10,
        paddingBottom: 10,
        alignItems: "center",
    },
    grabber: {
        width: 62,
        height: 6,
        borderRadius: 999,
        backgroundColor: "rgba(0,0,0,0.18)",
    },

    collapsed: {
        paddingHorizontal: 14,
        paddingBottom: 10,
        rowGap: 10,
    },

    quickRow: {
        flexDirection: "row",
        columnGap: 10,
        justifyContent: "space-between",
    },
    quickBtn: { flex: 1 },

    hint: {
        textAlign: "center",
        color: SUB,
        fontSize: 12,
        fontWeight: "900",
    },

    expanded: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        rowGap: 12,
    },

    row: {
        flexDirection: "row",
        columnGap: 10,
        justifyContent: "space-between",
    },

    bigAction: {
        flex: 1,
        minHeight: 54,
        borderRadius: 16,
        paddingHorizontal: 10,
        justifyContent: "center",
    },

    smallAction: {
        flex: 1,
        minHeight: 46,
        borderRadius: 16,
    },

    softBtn: {
        minHeight: 44,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 10,
    },
    softBtnText: {
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        textAlign: "center",
    },

    status: {
        alignItems: "center",
        rowGap: 4,
        paddingTop: 2,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: "900",
        color: TXT,
    },
    statusSub: {
        fontSize: 13,
        fontWeight: "800",
        color: SUB,
    },

    bottomNav: {
        marginTop: 2,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.08)",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-around",
    },
    miniNavItem: {
        alignItems: "center",
        rowGap: 2,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    miniNavIcon: {
        fontSize: 18,
    },
    miniNavLabel: {
        fontSize: 12,
        fontWeight: "900",
    },
});
