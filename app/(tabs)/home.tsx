// app/(tabs)/home.tsx
import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { Pressable } from "react-native";
import { useTracking } from "@/src/features/tracking/TrackingProvider";


const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";



export default function HomeScreen() {
  const { user, isGuest, hasSession, isAuthLoaded } = useAuth();
  const {
  mode,
  frequencySec,
  lastPingAt,
  lastError,
  setFrequency,
  startActive,
  stopActive,
  startEmergency,
  stopEmergency,
  pingOnce,
} = useTracking();


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
    Status:{" "}
    <Text style={{ color: "#fff", fontWeight: "800" }}>
      {mode === "idle" ? "OFF" : mode === "active" ? "ACTIVE" : "EMERGENCY"}
    </Text>
  </Text>

  <Text style={[styles.bodyText, { marginTop: 6 }]}>
    Frequency:{" "}
    <Text style={{ color: "#fff", fontWeight: "800" }}>
      {mode === "emergency" ? "30s (fixed)" : frequencySec === 30 ? "30s" : frequencySec === 60 ? "1m" : "5m"}
    </Text>
  </Text>

  {mode !== "emergency" && (
    <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
      {[30, 60, 300].map((sec) => {
        const active = frequencySec === sec;
        return (
          <Pressable
            key={sec}
            onPress={() => setFrequency(sec as any)}
            style={[
              styles.pill,
              active && { borderColor: ACCENT, backgroundColor: "rgba(56,150,255,0.14)" },
            ]}
          >
            <Text style={[styles.pillText, active && { color: "#fff" }]}>
              {sec === 30 ? "30s" : sec === 60 ? "1m" : "5m"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  )}

  <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
    {mode === "active" ? (
      <Pressable style={[styles.actionBtn, styles.btnOutline]} onPress={stopActive}>
        <Text style={styles.btnOutlineText}>Stop Active</Text>
      </Pressable>
    ) : (
      <Pressable style={[styles.actionBtn, styles.btnPrimary]} onPress={startActive} disabled={mode === "emergency"}>
        <Text style={styles.btnPrimaryText}>Start Active</Text>
      </Pressable>
    )}

    {mode === "emergency" ? (
      <Pressable style={[styles.actionBtn, styles.btnDanger]} onPress={stopEmergency}>
        <Text style={styles.btnDangerText}>Stop Emergency</Text>
      </Pressable>
    ) : (
      <Pressable style={[styles.actionBtn, styles.btnDanger]} onPress={startEmergency}>
        <Text style={styles.btnDangerText}>Emergency</Text>
      </Pressable>
    )}

    <Pressable style={[styles.actionBtn, styles.btnOutline]} onPress={pingOnce}>
      <Text style={styles.btnOutlineText}>Ping Now</Text>
    </Pressable>
  </View>

  <Text style={[styles.bodyText, { marginTop: 10 }]}>
    Last ping:{" "}
    <Text style={{ color: "#fff", fontWeight: "700" }}>
      {lastPingAt ? new Date(lastPingAt).toLocaleTimeString() : "—"}
    </Text>
  </Text>

  {!!lastError && (
    <Text style={[styles.bodyText, { marginTop: 6, color: DANGER }]}>
      {lastError}
    </Text>
  )}
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
  pill: {
  borderWidth: 1,
  borderColor: BORDER,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 999,
  backgroundColor: "transparent",
},
pillText: {
  color: MUTED,
  fontSize: 13,
  fontWeight: "800",
},
actionBtn: {
  borderRadius: 14,
  paddingVertical: 12,
  paddingHorizontal: 14,
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
},
btnPrimary: {
  borderColor: ACCENT,
  backgroundColor: "rgba(56,150,255,0.16)",
},
btnPrimaryText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "800",
},
btnOutline: {
  borderColor: BORDER,
  backgroundColor: "transparent",
},
btnOutlineText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "800",
},
btnDanger: {
  borderColor: DANGER,
  backgroundColor: "rgba(255,75,92,0.12)",
},
btnDangerText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "900",
},


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
