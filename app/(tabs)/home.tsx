// app/(tabs)/home.tsx
import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function HomeScreen() {
  const { user, isGuest, hasSession, isAuthLoaded } = useAuth();

  // Home should never render without a session because root gating redirects,
  // but this keeps the UI sane during dev edge cases.
  if (!isAuthLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={[styles.card, styles.skeletonCard]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>SafeSteps</Text>
            <Text style={styles.bodyText}>
              Session not found. You should be redirected to login.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const primaryLabel = isGuest
    ? "Guest session"
    : user?.email ?? "Signed in";

  const badgeText = isGuest ? "LOCAL ONLY" : "SIGNED IN";
  const badgeStyle = isGuest ? styles.badgeGuest : styles.badgeAuthed;

  const secondaryText = isGuest
    ? "Your location and history stay on this device. Sharing and cloud sync require an account."
    : "You’re signed in. Your account will securely sync history, trusted contacts, and sharing sessions.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Persistent Welcome Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Welcome</Text>
            <View style={[styles.badge, badgeStyle]}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>

          <Text style={styles.value}>{primaryLabel}</Text>
          <Text style={styles.bodyText}>{secondaryText}</Text>
        </View>

        {/* Placeholder for next v1 controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking</Text>
          <Text style={styles.bodyText}>
            Next: Active Tracking toggle, ping frequency, and Emergency Mode.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sharing</Text>
          <Text style={styles.bodyText}>
            v1 includes secure share links with expiration, recipients, and on/off state.
          </Text>
        </View>

        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  skeletonCard: {
    height: 120,
    opacity: 0.5,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  value: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  bodyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeAuthed: {
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.14)",
  },
  badgeGuest: {
    borderColor: DANGER,
    backgroundColor: "rgba(255,75,92,0.10)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  spacer: {
    flex: 1,
  },
});
