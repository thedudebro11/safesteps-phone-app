// app/(tabs)/contacts.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTrustedContacts } from "@/src/features/trust/useTrustedContacts";
import type { IncomingTrustRequest, TrustedContact } from "@/src/features/trust/types";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";
const OK = "#34d399";
const AMBER = "#fbbf24";

// ─── Toggle ─────────────────────────────────────────────────────────────────────
// Unchanged component — only styling tokens updated to match design system
function Toggle({ value }: { value: boolean }) {
  return (
    <View style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      <View style={[styles.toggleKnob, value ? styles.toggleKnobOn : styles.toggleKnobOff]} />
    </View>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────────
function Avatar({ label }: { label: string | null | undefined }) {
  const initial = (label?.trim() ?? "?")[0].toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────────
function SectionHeader({
  label,
  count,
  urgent,
}: {
  label: string;
  count?: number;
  urgent?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      {urgent && <View style={styles.sectionUrgentDot} />}
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Request row ──────────────────────────────────────────────────────────────────
// NOTE: IncomingTrustRequest only exposes requester_user_id (a UUID).
// Displaying a name/email would require an additional API lookup — not done here.
// The truncated UUID is shown as an identifier until the data model exposes more.
function RequestRow({
  item,
  busy,
  onAccept,
  onDeny,
}: {
  item: IncomingTrustRequest;
  busy: boolean;
  onAccept: (id: string) => void;
  onDeny: (id: string) => void;
}) {
  const shortId = `${item.requester_user_id.slice(0, 8)}…`;

  return (
    <View style={styles.requestCard}>
      {/* Avatar: "?" since requester name is unavailable without extra lookup */}
      <Avatar label="?" />

      <View style={styles.requestInfo}>
        <Text style={styles.requestTitle}>Trust request</Text>
        <Text style={styles.requestMeta}>User {shortId}</Text>
      </View>

      <View style={styles.requestActions}>
        <Pressable
          onPress={() => onAccept(item.id)}
          disabled={busy}
          style={[styles.acceptBtn, busy && { opacity: 0.55 }]}
        >
          <Text style={styles.acceptBtnText}>Accept</Text>
        </Pressable>

        {/* Decline is a ghost button — less prominent, still accessible */}
        <Pressable
          onPress={() => onDeny(item.id)}
          disabled={busy}
          style={busy && { opacity: 0.55 }}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────────
function ContactRow({
  item,
  busy,
  onToggle,
}: {
  item: TrustedContact;
  busy: boolean;
  onToggle: (c: TrustedContact) => void;
}) {
  const primaryLabel = item.displayName ?? item.email;
  const hasDisplayName = !!item.displayName;

  return (
    <View style={styles.contactCard}>
      {/* Main row: avatar + name/email + toggle */}
      <View style={styles.contactRow}>
        <Avatar label={primaryLabel} />

        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>
            {primaryLabel}
          </Text>
          {hasDisplayName && (
            <Text style={styles.contactEmail} numberOfLines={1}>
              {item.email}
            </Text>
          )}
        </View>

        {/* Visibility toggle — same onToggle logic, clearer label */}
        <Pressable
          onPress={() => onToggle(item)}
          disabled={busy}
          style={[styles.toggleSection, busy && { opacity: 0.55 }]}
        >
          <Toggle value={item.shareEnabled} />
          <Text
            style={[
              styles.toggleLabel,
              item.shareEnabled ? styles.toggleLabelOn : styles.toggleLabelOff,
            ]}
          >
            {item.shareEnabled ? "Visible" : "Hidden"}
          </Text>
        </Pressable>
      </View>

      {/* Visibility subrow — explains what the toggle controls in plain language */}
      <View style={styles.contactSubrow}>
        <View style={styles.visibilityLabelRow}>
          <Text style={styles.visibilityKey}>Visible on their map</Text>
          <Text
            style={[
              styles.visibilityStatus,
              item.shareEnabled ? styles.visibilityStatusOn : styles.visibilityStatusOff,
            ]}
          >
            {item.shareEnabled ? "On" : "Off"}
          </Text>
        </View>
        <Text style={styles.visibilitySubtext}>
          {item.shareEnabled
            ? "They can see you when you're sharing"
            : "Hidden from their map"}
        </Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────────
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

  const sortedIncoming = useMemo(
    () => [...incoming].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [incoming]
  );

  // ── Handlers — logic unchanged ──────────────────────────────────────────────

  async function onToggleShare(c: TrustedContact) {
    try {
      await setShareEnabled(c.userId, !c.shareEnabled);
    } catch (e: any) {
      Alert.alert("Could not update visibility", e?.message ?? "Try again.");
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
        Alert.alert("That's you", "You can't add yourself.");
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>
              Trusted people who can see you on the map.
            </Text>
          </View>
          <Pressable
            onPress={refetch}
            disabled={busy || isLoading}
            style={[styles.refreshBtn, (busy || isLoading) && { opacity: 0.55 }]}
          >
            <Text style={styles.refreshBtnText}>{isLoading ? "…" : "Refresh"}</Text>
          </Pressable>
        </View>

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {errorMsg ? (
          <View style={styles.bannerDanger}>
            <Text style={styles.bannerDangerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ACCENT} />
            <Text style={styles.loadingText}>Loading contacts…</Text>
          </View>
        )}

        {/* ── SECTION 1: Requests (only when they exist) ───────────────────── */}
        {!isLoading && sortedIncoming.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              label="Requests"
              count={sortedIncoming.length}
              urgent
            />
            {sortedIncoming.map((item) => (
              <RequestRow
                key={item.id}
                item={item}
                busy={busy}
                onAccept={onAccept}
                onDeny={onDeny}
              />
            ))}
          </View>
        )}

        {/* ── SECTION 2: Trusted Contacts ──────────────────────────────────── */}
        {!isLoading && (
          <View style={styles.section}>
            <SectionHeader label="Trusted Contacts" count={contacts.length} />

            {contacts.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No trusted contacts yet</Text>
                <Text style={styles.emptyBody}>
                  Add someone by email below. Both of you must accept before
                  any location sharing can happen.
                </Text>
              </View>
            ) : (
              contacts.map((item) => (
                <ContactRow
                  key={item.userId}
                  item={item}
                  busy={busy}
                  onToggle={onToggleShare}
                />
              ))
            )}
          </View>
        )}

        {/* ── SECTION 3: Add Contact ───────────────────────────────────────── */}
        <View style={styles.section}>
          <SectionHeader label="Add Contact" />
          <View style={styles.addCard}>
            <Text style={styles.addCardBody}>
              Enter an email address. They'll need to accept your request before
              either of you can share location.
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
                style={[
                  styles.sendBtn,
                  (busy || !email.trim()) && { opacity: 0.45 },
                ]}
              >
                <Text style={styles.sendBtnText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 24 },

  // ── Header
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 3 },

  refreshBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshBtnText: { color: MUTED, fontWeight: "800", fontSize: 13 },

  // ── Error banner
  bannerDanger: {
    borderWidth: 1,
    borderColor: "rgba(255,75,92,0.4)",
    backgroundColor: "rgba(255,75,92,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  bannerDangerText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // ── Loading
  loadingWrap: { alignItems: "center", paddingVertical: 32, gap: 10 },
  loadingText: { color: MUTED, fontSize: 13 },

  // ── Section
  section: { gap: 10 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 2,
    marginBottom: 2,
  },
  sectionUrgentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AMBER,
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

  // ── Avatar
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(56,150,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(56,150,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { color: ACCENT, fontSize: 15, fontWeight: "800" },

  // ── Request card
  // Amber left-accent border communicates "action needed" without full alarm
  requestCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  requestInfo: { flex: 1, minWidth: 0 },
  requestTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  requestMeta: { color: MUTED, fontSize: 12, marginTop: 2 },

  requestActions: { flexDirection: "row", alignItems: "center", gap: 10 },

  // Accept: green filled, prominent
  acceptBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.16)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.4)",
  },
  acceptBtnText: { color: OK, fontSize: 13, fontWeight: "800" },

  // Decline: ghost — present but not competing with Accept
  declineText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },

  // ── Contact card
  contactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    paddingBottom: 12,
  },
  contactInfo: { flex: 1, minWidth: 0 },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "800" },
  contactEmail: { color: MUTED, fontSize: 12, marginTop: 2 },

  // Toggle section: stacked vertically (toggle above label)
  toggleSection: { alignItems: "center", gap: 5, flexShrink: 0 },
  toggleLabel: { fontSize: 11, fontWeight: "800" },
  toggleLabelOn: { color: OK },
  toggleLabelOff: { color: MUTED },

  // Visibility subrow — explains what the toggle means in plain English
  contactSubrow: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  visibilityLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visibilityKey: { color: MUTED, fontSize: 12, fontWeight: "700" },
  visibilityStatus: { fontSize: 12, fontWeight: "800" },
  visibilityStatusOn: { color: OK },
  visibilityStatusOff: { color: MUTED },
  visibilitySubtext: { color: "#4a5578", fontSize: 12, lineHeight: 16 },

  // ── Toggle component
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    justifyContent: "center",
  },
  toggleOn: {
    backgroundColor: "rgba(56,150,255,0.20)",
    borderColor: "rgba(56,150,255,0.55)",
  },
  toggleOff: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: BORDER,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  toggleKnobOn: { alignSelf: "flex-end" },
  toggleKnobOff: { alignSelf: "flex-start", opacity: 0.6 },

  // ── Empty state
  emptyState: {
    padding: 20,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
    alignItems: "center",
  },
  emptyTitle: { color: MUTED, fontSize: 14, fontWeight: "800" },
  emptyBody: {
    color: "#4a5578",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },

  // ── Add Contact card
  addCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
  },
  addCardBody: { color: MUTED, fontSize: 13, lineHeight: 18 },
  addRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  sendBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
