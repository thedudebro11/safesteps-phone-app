// app/(tabs)/shares.tsx
import React from "react";
import {
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useRouter } from "expo-router";
import { useShares } from "@/src/features/shares/SharesProvider";
import { confirm } from "@/src/lib/confirm";
import { useTracking } from "@/src/features/tracking/TrackingProvider";
import { shouldStopEmergencyAfterEndingShare } from "@/src/features/shares/emergencySync";
import LiveMapCard from "@/src/features/map/LiveMapCard";
import type { ShareSession } from "@/src/features/shares/types";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff3b4e";
const OK = "#34d399";
const AMBER = "#fbbf24";

// ─── Time helpers ─────────────────────────────────────────────────────────────

// Relative elapsed time — for active sessions: "4 min ago", "2h ago"
function fmtElapsed(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    const hr = Math.floor(min / 60);

    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
}

// Readable timestamp — for past sessions: "Today · 2:34 PM", "Mar 14 · 9:05 AM"
function fmtTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const timePart = d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
    });

    if (d.toDateString() === now.toDateString()) return `Today · ${timePart}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday · ${timePart}`;

    const datePart = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    });
    return `${datePart} · ${timePart}`;
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({
    label,
    count,
    live,
}: {
    label: string;
    count?: number;
    live?: boolean;
}) {
    return (
        <View style={styles.sectionHeader}>
            {live && <View style={styles.liveDot} />}
            <Text style={styles.sectionLabel}>{label}</Text>
            {count !== undefined && count > 0 && (
                <View style={styles.sectionCount}>
                    <Text style={styles.sectionCountText}>{count}</Text>
                </View>
            )}
        </View>
    );
}

// ─── Reason badge ─────────────────────────────────────────────────────────────
// Shows "Emergency" in amber for sessions started via emergency mode
function ReasonBadge({ reason }: { reason: ShareSession["reason"] }) {
    if (reason !== "emergency") return null;
    return (
        <View style={styles.reasonBadge}>
            <Text style={styles.reasonBadgeText}>Emergency</Text>
        </View>
    );
}

// ─── Active session card ──────────────────────────────────────────────────────
function ActiveCard({
    item,
    onEnd,
}: {
    item: ShareSession;
    onEnd: (item: ShareSession) => void;
}) {
    const secondary = item.contactSnapshot.email ?? item.contactSnapshot.phone ?? null;

    return (
        <View style={styles.activeCard}>
            {/* Left: contact info */}
            <View style={styles.cardBody}>
                <View style={styles.cardNameRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                        {item.contactSnapshot.name}
                    </Text>
                    <ReasonBadge reason={item.reason} />
                </View>

                {secondary ? (
                    <Text style={styles.cardSecondary} numberOfLines={1}>
                        {secondary}
                    </Text>
                ) : null}

                {/* Elapsed time */}
                <View style={styles.liveRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.liveLabel}>
                        Live now · Started {fmtElapsed(item.startedAt)}
                    </Text>
                </View>
            </View>

            {/* End Session — outlined danger, preserves existing confirm + emergency sync */}
            <Pressable
                onPress={() => onEnd(item)}
                style={styles.endBtn}
            >
                <Text style={styles.endBtnText}>End</Text>
            </Pressable>
        </View>
    );
}

// ─── Past session card ────────────────────────────────────────────────────────
function PastCard({ item }: { item: ShareSession }) {
    const secondary = item.contactSnapshot.email ?? item.contactSnapshot.phone ?? null;

    return (
        <View style={styles.pastCard}>
            <View style={styles.pastCardTop}>
                <Text style={styles.pastCardName} numberOfLines={1}>
                    {item.contactSnapshot.name}
                </Text>
                <View style={styles.endedBadge}>
                    <Text style={styles.endedBadgeText}>Ended</Text>
                </View>
            </View>

            {secondary ? (
                <Text style={styles.cardSecondary} numberOfLines={1}>
                    {secondary}
                </Text>
            ) : null}

            {/* Timing: start + optional end */}
            <Text style={styles.pastTiming}>
                {fmtTime(item.startedAt)}
                {item.endedAt ? ` → ${fmtTime(item.endedAt)}` : ""}
            </Text>

            {/* Reason badge inline for past sessions */}
            {item.reason === "emergency" && (
                <View style={[styles.reasonBadge, { alignSelf: "flex-start", marginTop: 4 }]}>
                    <Text style={styles.reasonBadgeText}>Emergency session</Text>
                </View>
            )}
        </View>
    );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SharesScreen() {
    const router = useRouter();
    const { shares, getActiveShares, endShare } = useShares();
    const { mode, stopEmergency } = useTracking();

    const active = getActiveShares();
    // Render ended sessions — data is already present in `shares`, previously hidden
    const pastSessions = shares.filter((s) => s.status === "ended");
    const hasSessions = shares.length > 0;

    // ✅ End share handler — logic unchanged from original
    async function handleEndShare(item: ShareSession) {
        const ok = await confirm(
            "End session?",
            "This will stop live location sharing for this contact.",
            "End",
            "Cancel"
        );
        if (!ok) return;

        const activeBefore = getActiveShares();
        const willStopEmergency = shouldStopEmergencyAfterEndingShare({
            mode,
            endingShare: item,
            activeShares: activeBefore,
        });

        await endShare(item.id);

        if (willStopEmergency) stopEmergency();
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.container, { flexGrow: 1 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ───────────────────────────────────────────────── */}
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Sessions</Text>
                        <Text style={styles.subtitle}>
                            Who you're sharing your location with.
                        </Text>
                    </View>
                    {/* New Share — routes to contacts with share intent, unchanged */}
                    <Pressable
                        onPress={() => router.push("/contacts?share=1")}
                        style={styles.newShareBtn}
                    >
                        <Text style={styles.newShareText}>+ New</Text>
                    </Pressable>
                </View>

                {/* ── Live map (unchanged) ─────────────────────────────────── */}
                <LiveMapCard title="Live Map" />

                {/* ── Full empty state ─────────────────────────────────────── */}
                {!hasSessions && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No shared sessions yet</Text>
                        <Text style={styles.emptyBody}>
                            Start sharing your location to create a session.
                        </Text>
                    </View>
                )}

                {/* ── SECTION: Active Sessions ─────────────────────────────── */}
                {active.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            label="Active Sessions"
                            count={active.length}
                            live
                        />
                        {active.map((item) => (
                            <ActiveCard
                                key={item.id}
                                item={item}
                                onEnd={handleEndShare}
                            />
                        ))}
                    </View>
                )}

                {/* ── SECTION: Past Sessions ───────────────────────────────── */}
                {pastSessions.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            label="Past Sessions"
                            count={pastSessions.length}
                        />
                        {pastSessions.map((item) => (
                            <PastCard key={item.id} item={item} />
                        ))}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BG },
    container: { padding: 20, paddingBottom: 80, gap: 20 },

    // ── Header
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    title: { color: "#fff", fontSize: 24, fontWeight: "900" },
    subtitle: { color: MUTED, fontSize: 13, marginTop: 3 },

    // New Share: blue-accented — it's a primary action here
    newShareBtn: {
        borderWidth: 1,
        borderColor: ACCENT,
        backgroundColor: "rgba(56,150,255,0.16)",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
    },
    newShareText: { color: "#fff", fontWeight: "900", fontSize: 13 },

    // ── Section
    section: { gap: 10 },

    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingLeft: 2,
        marginBottom: 2,
    },
    // Green pulse dot — signals "currently live" in the section header
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: OK,
    },
    sectionLabel: {
        color: MUTED,
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 0.8,
        textTransform: "uppercase",
        flex: 1,
    },
    sectionCount: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "rgba(255,255,255,0.03)",
    },
    sectionCountText: { color: MUTED, fontSize: 11, fontWeight: "800" },

    // ── Reason badge (emergency sessions)
    reasonBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(251,191,36,0.4)",
        backgroundColor: "rgba(251,191,36,0.10)",
    },
    reasonBadgeText: { color: AMBER, fontSize: 11, fontWeight: "800" },

    // ── Active session card
    // Green left-border accent + subtle green tint = "live and intentional"
    activeCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        borderLeftWidth: 3,
        borderLeftColor: OK,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    cardBody: { flex: 1, gap: 4, minWidth: 0 },
    cardNameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    cardName: { color: "#fff", fontSize: 15, fontWeight: "800" },
    cardSecondary: { color: MUTED, fontSize: 12 },

    // Live indicator row inside the active card
    liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    livePulseDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: OK,
    },
    liveLabel: { color: OK, fontSize: 12, fontWeight: "700" },

    // End Session button — outlined danger
    // Outlined (not filled) so it reads as cautious, not alarming
    endBtn: {
        borderWidth: 1,
        borderColor: DANGER,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 14,
        flexShrink: 0,
    },
    endBtnText: { color: DANGER, fontSize: 13, fontWeight: "800" },

    // ── Past session card
    // No accent border, muted background — clearly informational, not actionable
    pastCard: {
        backgroundColor: CARD_BG,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: BORDER,
        padding: 14,
        gap: 4,
        opacity: 0.8,
    },
    pastCardTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    pastCardName: { color: MUTED, fontSize: 14, fontWeight: "800", flex: 1 },

    // Ended badge — muted pill, no color
    endedBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: BORDER,
        backgroundColor: "rgba(255,255,255,0.03)",
    },
    endedBadgeText: { color: MUTED, fontSize: 11, fontWeight: "800" },

    // Timing: "Today · 2:34 PM → Today · 3:08 PM"
    pastTiming: { color: "#4a5578", fontSize: 12, fontWeight: "600" },

    // ── Empty state
    emptyState: {
        paddingVertical: 40,
        alignItems: "center",
        gap: 8,
    },
    emptyTitle: { color: MUTED, fontSize: 14, fontWeight: "800" },
    emptyBody: { color: "#4a5578", fontSize: 13, lineHeight: 18, textAlign: "center" },
});
