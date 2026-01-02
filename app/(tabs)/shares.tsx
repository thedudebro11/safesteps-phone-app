// app/(tabs)/shares.tsx
import React from "react";
import { SafeAreaView, StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";

export default function SharesScreen() {
  const router = useRouter();

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
          <Text style={styles.bodyText}>
            Next step: this screen will list share sessions (LIVE / STALE), time remaining,
            and allow revoke/end per share.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why Shares exists</Text>
          <Text style={styles.bodyText}>
            Home is "Now" (tracking + map). Shares is "Who is seeing me right now?"
            This keeps V1 honest and prevents clutter.
          </Text>
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
});
