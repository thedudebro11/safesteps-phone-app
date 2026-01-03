// app/(tabs)/home.tsx
import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { Pressable } from "react-native";
import { useTracking } from "@/src/features/tracking/TrackingProvider";
import { useRouter } from "expo-router";
import { AppState } from "react-native";
import { useShares } from "@/src/features/shares/SharesProvider";
import { tryLocalNotify } from "@/src/lib/notify";
import { useContacts } from "@/src/features/contacts/ContactsProvider";
import { EmergencyRecipientsModal } from "@/src/features/emergency/EmergencyRecipientsModal";
import { getEmergencyRecipientLimit } from "@/src/lib/tiers";




const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";




export default function HomeScreen() {
  const { createShareForContact, getActiveShares, endShare } = useShares();

  const activeSharesCount = getActiveShares().length;


  const [showNoShareNudge, setShowNoShareNudge] = React.useState(false);
  const nudgeFiredRef = React.useRef(false);
  const appStateRef = React.useRef(AppState.currentState);

  const router = useRouter();
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
  const { contacts } = useContacts();

  const [emergencyModalOpen, setEmergencyModalOpen] = React.useState(false);

  const maxEmergencyRecipients = getEmergencyRecipientLimit({
    isGuest,
    isPremium: false, // wire later
  });
  async function stopEmergencyEverywhere() {
    // 1) Stop emergency mode (tracking layer)
    stopEmergency();

    // 2) End all active emergency shares (sharing layer)
    const emergencyShares = getActiveShares().filter((s) => s.reason === "emergency");
    for (const s of emergencyShares) {
      await endShare(s.id);
    }
  }



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

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    // Reset when leaving active mode
    if (mode !== "active") {
      nudgeFiredRef.current = false;
      setShowNoShareNudge(false);
      return;
    }

    // If they have shares, no nudge.
    if (activeSharesCount > 0) {
      setShowNoShareNudge(false);
      return;
    }

    // Only fire once per active session
    if (nudgeFiredRef.current) return;

    const ms = 25_000; // 25 seconds (tweak 20–30s as desired)
    const t = setTimeout(async () => {
      // Re-check current truth at fire time
      if (mode !== "active") return;
      if (getActiveShares().length > 0) return;

      nudgeFiredRef.current = true;
      setShowNoShareNudge(true);

      // If they left the app, attempt a local notification (optional)
      if (appStateRef.current !== "active") {
        await tryLocalNotify(
          "SafeSteps: Tracking is on",
          "You haven’t shared your live location yet. Open SafeSteps to share and avoid wasting battery."
        );
      }
    }, ms);

    return () => clearTimeout(t);
    // NOTE: We intentionally depend on mode + count only.
    // getActiveShares() is read again at fire time for correctness.
  }, [mode, activeSharesCount, getActiveShares]);


  const canShare = mode !== "idle";
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

          {mode === "active" && activeSharesCount === 0 && showNoShareNudge && (
            <View style={styles.nudgeCard}>
              <Text style={styles.nudgeTitle}>Tracking is on, but you’re not sharing yet</Text>
              <Text style={styles.nudgeText}>
                Active Tracking uses battery. Click Share Live Location to make it useful.
              </Text>


            </View>
          )}


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
              <Pressable style={[styles.actionBtn, styles.btnDanger]} onPress={stopEmergencyEverywhere}>

                <Text style={styles.btnDangerText}>Stop Emergency</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.actionBtn, styles.btnDanger]} onPress={() => setEmergencyModalOpen(true)}
              >
                <Text style={styles.btnDangerText}>Emergency</Text>
              </Pressable>
            )}


            <Pressable
              disabled={!canShare}
              onPress={() => router.push("/contacts?share=1")}
              style={[
                styles.shareBtn,
                !canShare && { opacity: 0.45 },
              ]}
            >
              <Text style={styles.shareBtnText}>
                Share Live Location
              </Text>
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
        {/* Emergency Recipients Picker */}
        <EmergencyRecipientsModal
          visible={emergencyModalOpen}
          contacts={contacts}
          maxSelectable={maxEmergencyRecipients}
          onCancel={() => setEmergencyModalOpen(false)}
          onConfirm={async (selected) => {
            for (const c of selected) {
              await createShareForContact(c, "emergency");
            }
            setEmergencyModalOpen(false);
            startEmergency();
          }}
        />
        <View style={styles.spacer} />
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  nudgeCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  nudgeTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
  },
  nudgeText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  nudgeBtn: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  nudgeBtnPrimary: {
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
  },
  nudgeBtnPrimaryText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
  },
  nudgeBtnGhost: {
    borderColor: BORDER,
    backgroundColor: "transparent",
  },
  nudgeBtnGhostText: {
    color: MUTED,
    fontWeight: "900",
    fontSize: 12,
  },

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
  shareBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
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
