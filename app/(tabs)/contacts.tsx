// app/(tabs)/contacts.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContacts } from "@/src/features/contacts/ContactsProvider";
import { useShares } from "@/src/features/shares/SharesProvider";
import { confirm } from "@/src/lib/confirm";


const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

type ContactFormState = {
  name: string;
  phone: string;
  email: string;
};

export default function ContactsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ share?: string }>();
  const inShareMode = params.share === "1";

  const { contacts, addContact, removeContact, isLoaded } = useContacts();
  const { createShareForContact, getActiveShareByContactId, endShare } =
    useShares();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    phone: "",
    email: "",
  });

  const headerSubtitle = useMemo(() => {
    if (!inShareMode) return "Manage trusted contacts for sharing and emergency.";
    return "Choose a trusted contact to share your live location.";
  }, [inShareMode]);

  async function onCreateContact() {
    try {
      const created = await addContact({
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
      });
      setForm({ name: "", phone: "", email: "" });
      setModalOpen(false);

      if (inShareMode) {
        Alert.alert("Contact added", `Now share your location with ${created.name}.`);
      }
    } catch (e: any) {
      Alert.alert("Could not add contact", e?.message ?? "Please try again.");
    }
  }

  async function onShare(contactId: string) {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    await createShareForContact(contact);

    Alert.alert(
      "Sharing started",
      `Live location sharing is now active for ${contact.name}.`,
      [
        { text: "Stay here", style: "cancel" },
        { text: "View Shares", onPress: () => router.push("/shares") },
      ]
    );
  }

  async function onStopShare(contactId: string) {
    const active = getActiveShareByContactId(contactId);
    if (!active) return;
    await endShare(active.id);
  }

  async function onDeleteContact(contactId: string) {
    const ok = await confirm(
      "Remove contact?",
      "This removes the trusted contact from your list.",
      "Remove",
      "Cancel"
    );
    if (!ok) return;

    const active = getActiveShareByContactId(contactId);
    if (active) await endShare(active.id);
    await removeContact(contactId);
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Contacts</Text>
            <Text style={styles.subtitle}>{headerSubtitle}</Text>
          </View>

          <Pressable onPress={() => setModalOpen(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>

        {inShareMode && (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Share Live Location</Text>
            <Text style={styles.bannerText}>
              Select a trusted contact and tap{" "}
              <Text style={{ color: "#fff" }}>Share Location Link</Text>. You can
              stop sharing anytime.
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trusted Contacts</Text>

          {!isLoaded ? (
            <Text style={styles.bodyText}>Loading contacts…</Text>
          ) : contacts.length === 0 ? (
            <Text style={styles.bodyText}>
              No contacts yet. Add one to start sharing your live location.
            </Text>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingTop: 12 }}
              renderItem={({ item }) => {
                const active = getActiveShareByContactId(item.id);
                return (
                  <View style={styles.row}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.rowTop}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        {active ? (
                          <View style={styles.sharingPill}>
                            <Text style={styles.sharingPillText}>SHARING</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.contactMeta}>
                        {item.phone ? item.phone : "No phone"}{" "}
                        {item.email ? `• ${item.email}` : ""}
                      </Text>
                    </View>

                    <View style={styles.rowActions}>
                      {!active ? (
                        <Pressable
                          onPress={() => onShare(item.id)}
                          style={[styles.smallBtn, styles.smallBtnPrimary]}
                        >
                          <Text style={styles.smallBtnPrimaryText}>
                            Share Location Link
                          </Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          onPress={() => onStopShare(item.id)}
                          style={[styles.smallBtn, styles.smallBtnDanger]}
                        >
                          <Text style={styles.smallBtnDangerText}>Stop</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => onDeleteContact(item.id)}
                        style={[styles.smallBtn, styles.smallBtnGhost]}
                      >
                        <Text style={styles.smallBtnGhostText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>

        <Modal
          transparent
          animationType="fade"
          visible={modalOpen}
          onRequestClose={() => setModalOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add Trusted Contact</Text>

              <Text style={styles.label}>Name</Text>
              <TextInput
                value={form.name}
                onChangeText={(t) => setForm((p) => ({ ...p, name: t }))}
                placeholder="Full name"
                placeholderTextColor="#5f6b86"
                style={styles.input}
              />

              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                value={form.phone}
                onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
                placeholder="(555) 555-5555"
                placeholderTextColor="#5f6b86"
                style={styles.input}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Email (optional)</Text>
              <TextInput
                value={form.email}
                onChangeText={(t) => setForm((p) => ({ ...p, email: t }))}
                placeholder="name@email.com"
                placeholderTextColor="#5f6b86"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setModalOpen(false)}
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onCreateContact}
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                >
                  <Text style={styles.modalBtnPrimaryText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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

  addBtn: {
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  addBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  banner: {
    backgroundColor: "rgba(56,150,255,0.12)",
    borderColor: "rgba(56,150,255,0.35)",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  bannerTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  bannerText: { color: MUTED, fontSize: 13, lineHeight: 18 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  bodyText: { color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 18 },

  row: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactName: { color: "#fff", fontWeight: "900", fontSize: 14 },
  contactMeta: { color: MUTED, fontSize: 12 },

  sharingPill: {
    borderWidth: 1,
    borderColor: "rgba(56,150,255,0.5)",
    backgroundColor: "rgba(56,150,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sharingPillText: { color: "#fff", fontSize: 11, fontWeight: "900" },

  rowActions: { gap: 8 },

  smallBtn: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  smallBtnPrimary: {
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
  },
  smallBtnPrimaryText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  smallBtnDanger: {
    borderColor: DANGER,
    backgroundColor: "rgba(255,75,92,0.16)",
  },
  smallBtnDangerText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  smallBtnGhost: { borderColor: BORDER, backgroundColor: "transparent" },
  smallBtnGhostText: { color: MUTED, fontSize: 12, fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  label: { color: MUTED, fontSize: 12, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  modalBtnGhost: { borderColor: BORDER, backgroundColor: "transparent" },
  modalBtnGhostText: { color: MUTED, fontWeight: "900" },
  modalBtnPrimary: {
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.16)",
  },
  modalBtnPrimaryText: { color: "#fff", fontWeight: "900" },
});
