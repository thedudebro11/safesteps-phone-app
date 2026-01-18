// src/features/map/LiveMapCard.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import SharedMap from "./SharedMap";
import { useTracking } from "@/src/features/tracking/TrackingProvider";
import { useShares } from "@/src/features/shares/SharesProvider";
import type { MapMarker } from "./types";

const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const MUTED = "#a6b1cc";
const ACCENT = "#3896ff";

export default function LiveMapCard({ title = "Live Map" }: { title?: string }) {
    const { lastFix, mode } = useTracking();
    const { getActiveShares } = useShares();
    const activeShares = getActiveShares();

    const sharingWith = useMemo(() => {
        if (activeShares.length === 0) return null;
        const names = activeShares.map((s) => s.contactSnapshot.name).filter(Boolean);
        return names.length ? names.join(", ") : `${activeShares.length} contact(s)`;
    }, [activeShares]);

    const markers: MapMarker[] = useMemo(() => {
        if (!lastFix) return [];
        const subtitle =
            mode === "emergency"
                ? "Emergency mode"
                : sharingWith
                    ? `Sharing with: ${sharingWith}`
                    : mode === "active"
                        ? "Active tracking"
                        : "Last known location";

        return [
            {
                id: "me",
                position: { lat: lastFix.lat, lng: lastFix.lng },
                title: "You",
                subtitle,
            },
        ];
    }, [lastFix, mode, sharingWith]);

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>{title}</Text>
                {mode !== "idle" && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{mode.toUpperCase()}</Text>
                    </View>
                )}
            </View>

            {!lastFix ? (
                <View style={styles.empty}>
                    <Text style={styles.bodyText}>
                        No location fix yet. Start Active Tracking or Emergency to load the map.
                    </Text>
                </View>
            ) : (
                <>
                    <View pointerEvents="none">
                        <SharedMap
                            center={{ lat: lastFix.lat, lng: lastFix.lng }}
                            markers={markers}
                            height={220}
                        />
                    </View>

                    <Text style={[styles.bodyText, { marginTop: 10 }]}>
                        {sharingWith ? `Sharing with: ` : `Sharing: `}
                        <Text style={{ color: "#fff", fontWeight: "800" }}>
                            {sharingWith ?? "Off"}
                        </Text>
                    </Text>

                    <Text style={styles.bodyText}>
                        Accuracy:{" "}
                        <Text style={{ color: "#fff", fontWeight: "800" }}>
                            {typeof lastFix.accuracyM === "number" ? `${Math.round(lastFix.accuracyM)}m` : "—"}
                        </Text>
                    </Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: CARD_BG,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 10,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
    bodyText: { color: MUTED, fontSize: 13, lineHeight: 18 },

    badge: {
        borderWidth: 1,
        borderColor: ACCENT,
        backgroundColor: "rgba(56,150,255,0.14)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    badgeText: { color: "#fff", fontWeight: "900", fontSize: 12 },

    empty: {
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        padding: 14,
        backgroundColor: "rgba(255,255,255,0.02)",
    },
});
