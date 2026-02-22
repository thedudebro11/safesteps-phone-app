// app/(tabs)/contacts.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTrustedContacts } from "@/src/features/trust/useTrustedContacts";
import type { TrustedContact } from "@/src/features/trust/types";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";
const OK = "#34d399";

function Toggle({ value }: { value: boolean }) {
  return (
    <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </View>
  );
}

export default function TrustedScreen() {
  const {
    contacts,
    incoming,
    isLoading,
    errorMsg,
    refetch,
    setShareEnabled,
    lookupUserByEmail,
    sendTrustRequest,
    acceptRequest,
    denyRequest,
  } = useTrustedContacts();

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const sortedIncoming = useMemo(() => {
    return [...incoming].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [incoming]);

  async function onToggleShare(c: TrustedContact) {
    try {
      await setShareEnabled(c.userId, !c.shareEnabled);
    } catch (e: any) {
      Alert.alert("Could not update sharing", e?.message ?? "Try again.");
    }
  }

  async function onAddByEmail() {
    const e = email.trim().toLowerCase();
    if (!e) return;

    setBusy(true);
    try {
      const lookup = await lookupUserByEmail(e);

      if (!lookup.exists) {
        Alert.alert("Not found", "That email is not registered yet.");
        return;
      }

      if ("isSelf" in lookup && lookup.isSelf) {
        Alert.alert("That’s you", "You can’t add yourself.");
        return;
      }

      await sendTrustRequest(lookup.userId);
      setEmail("");
      Alert.alert("Request sent", `Trust request sent to ${lookup.email}.`);
    } catch (e2: any) {
      Alert.alert("Could not send request", e2?.message ?? "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onAccept(id: string) {
    setBusy(true);
    try {
      await acceptRequest(id);
      Alert.alert("Accepted", "You are now trusted.");
    } catch (e: any) {
      Alert.alert("Could not accept", e?.message ?? "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeny(id: string) {
    setBusy(true);
    try {
      await denyRequest(id);
    } catch (e: any) {
      Alert.alert("Could not deny", e?.message ?? "Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Trusted</Text>
            <Text style={styles.subtitle}>
              Control who can see you when you’re live. Trust + visibility + presence.
            </Text>
          </View>

          <Pressable onPress={refetch} style={styles.refreshBtn} disabled={busy}>
            <Text style={styles.refreshBtnText}>{busy ? "…" : "Refresh"}</Text>
          </Pressable>
        </View>

        {errorMsg ? (
          <View style={styles.bannerDanger}>
            <Text style={styles.bannerDangerText}>{errorMsg}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add registered user</Text>
          <Text style={styles.bodyText}>
            Enter an email to send a trust request. They must accept it.
          </Text>

          <View style={styles.addRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@email.com"
              placeholderTextColor="#5f6b86"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            <Pressable
              onPress={onAddByEmail}
              disabled={busy || !email.trim()}
              style={[styles.addBtn, (busy || !email.trim()) && { opacity: 0.55 }]}
            >
              <Text style={styles.addBtnText}>Send</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Incoming requests</Text>
            <Text style={styles.pill}>{sortedIncoming.length}</Text>
          </View>

          {isLoading ? (
            <View style={{ marginTop: 12 }}>
              <ActivityIndicator />
              <Text style={styles.bodyText}>Loading…</Text>
            </View>
          ) : sortedIncoming.length === 0 ? (
            <Text style={styles.bodyText}>No incoming requests.</Text>
          ) : (
            <FlatList
              data={sortedIncoming}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ gap: 10, paddingTop: 12 }}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>Request</Text>
                    <Text style={styles.rowMeta}>From: {item.requester_user_id}</Text>
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => onAccept(item.id)}
                      disabled={busy}
                      style={[styles.smallBtn, styles.smallBtnOk, busy && { opacity: 0.55 }]}
                    >
                      <Text style={styles.smallBtnOkText}>Accept</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => onDeny(item.id)}
                      disabled={busy}
                      style={[styles.smallBtn, styles.smallBtnDanger, busy && { opacity: 0.55 }]}
                    >
                      <Text style={styles.smallBtnDangerText}>Deny</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Accepted contacts</Text>
            <Text style={styles.pill}>{contacts.length}</Text>
          </View>

          {isLoading ? (
            <View style={{ marginTop: 12 }}>
              <ActivityIndicator />
              <Text style={styles.bodyText}>Loading…</Text>
            </View>
          ) : contacts.length === 0 ? (
            <Text style={styles.bodyText}>
              No trusted contacts yet. Add someone by email above.
            </Text>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(it) => it.userId}
              contentContainerStyle={{ gap: 10, paddingTop: 12 }}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.rowTitle}>{item.displayName ?? item.email}</Text>
                    <Text style={styles.rowMeta}>{item.email}</Text>
                  </View>

                  <Pressable
                    onPress={() => onToggleShare(item)}
                    style={styles.toggleWrap}
                    disabled={busy}
                  >
                    <Toggle value={item.shareEnabled} />
                    <Text style={styles.toggleLabel}>
                      {item.shareEnabled ? "Sharing" : "Hidden"}
                    </Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>

        <Text style={styles.footerHint}>
          Tip: For live markers to appear, both sides must be trusted, visibility enabled, and the
          other person must have pinged within ~90 seconds.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { flex: 1, padding: 20, gap: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 4 },

  refreshBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  bannerDanger: {
    borderWidth: 1,
    borderColor: "rgba(255,75,92,0.45)",
    backgroundColor: "rgba(255,75,92,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  bannerDangerText: { color: "#fff", fontWeight: "800" },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  pill: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.03)",
  },

  bodyText: { color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 18 },

  addRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  addBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "900" },

  row: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  rowMeta: { color: MUTED, fontSize: 12 },

  rowActions: { flexDirection: "row", gap: 8 },

  smallBtn: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  smallBtnOk: { borderColor: OK, backgroundColor: "rgba(52,211,153,0.14)" },
  smallBtnOkText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  smallBtnDanger: { borderColor: DANGER, backgroundColor: "rgba(255,75,92,0.14)" },
  smallBtnDangerText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  toggleWrap: { alignItems: "flex-end", gap: 8 },
  toggleLabel: { color: MUTED, fontSize: 12, fontWeight: "800" },

  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: { backgroundColor: "rgba(56,150,255,0.20)", borderColor: "rgba(56,150,255,0.6)" },
  toggleOff: { backgroundColor: "rgba(255,255,255,0.02)" },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  toggleKnobOn: { alignSelf: "flex-end" },
  toggleKnobOff: { alignSelf: "flex-start", opacity: 0.75 },

  footerHint: { color: MUTED, fontSize: 12, lineHeight: 16, marginTop: 6 },
});