// app/(tabs)/shares.tsx
import React from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
    Pressable,
    FlatList,
    Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useShares } from "@/src/features/shares/SharesProvider";
import { confirm } from "@/src/lib/confirm";


const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function SharesScreen() {
    const router = useRouter();
    const { shares, getActiveShares, endShare } = useShares();
    const active = getActiveShares();

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={styles.title}>Shares</Text>
                    <Pressable
                        onPress={() => router.push("/contacts?share=1")}
                        style={styles.newShareBtn}
                    >
                        <Text style={styles.newShareText}>+ New Share</Text>
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Active Shares</Text>
                    {active.length === 0 ? (
                        <Text style={styles.bodyText}>
                            No active shares. Create one from Contacts or tap “New Share”.
                        </Text>
                    ) : (
                        <FlatList
                            data={active}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ gap: 12, paddingTop: 12 }}
                            renderItem={({ item }) => (
                                <View style={styles.row}>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <Text style={styles.rowTitle}>
                                            {item.contactSnapshot.name}
                                        </Text>
                                        <Text style={styles.rowMeta}>
                                            {item.contactSnapshot.phone
                                                ? item.contactSnapshot.phone
                                                : "No phone"}
                                            {item.contactSnapshot.email
                                                ? ` • ${item.contactSnapshot.email}`
                                                : ""}
                                        </Text>
                                        <Text style={styles.rowMeta}>
                                            Started: {new Date(item.startedAt).toLocaleString()}
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={async () => {
                                            const ok = await confirm(
                                                "End share?",
                                                "This will stop live location sharing for this contact.",
                                                "End",
                                                "Cancel"
                                            );
                                            if (!ok) return;
                                            await endShare(item.id);
                                        }}
                                        style={[styles.smallBtn, styles.smallBtnDanger]}
                                    >
                                        <Text style={styles.smallBtnDangerText}>End</Text>
                                    </Pressable>

                                </View>
                            )}
                        />
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Recent (Ended)</Text>
                    {shares.filter((s) => s.status === "ended").length === 0 ? (
                        <Text style={styles.bodyText}>No ended shares yet.</Text>
                    ) : (
                        <Text style={styles.bodyText}>
                            Ended shares are stored locally for now. Later we’ll add
                            server-backed session history.
                        </Text>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: BG },
    container: { flex: 1, padding: 20, gap: 16 },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    title: { color: "#fff", fontSize: 22, fontWeight: "900" },

    newShareBtn: {
        borderWidth: 1,
        borderColor: ACCENT,
        backgroundColor: "rgba(56,150,255,0.16)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 14,
    },
    newShareText: { color: "#fff", fontWeight: "900", fontSize: 13 },

    card: {
        backgroundColor: CARD_BG,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: BORDER,
        gap: 8,
    },
    cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
    bodyText: { color: MUTED, fontSize: 13, lineHeight: 18 },

    row: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderWidth: 1,
        borderColor: BORDER,
        borderRadius: 16,
        padding: 12,
    },
    rowTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
    rowMeta: { color: MUTED, fontSize: 12 },

    smallBtn: {
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
    },
    smallBtnDanger: { borderColor: DANGER, backgroundColor: "rgba(255,75,92,0.16)" },
    smallBtnDangerText: { color: "#fff", fontSize: 12, fontWeight: "900" },
});
