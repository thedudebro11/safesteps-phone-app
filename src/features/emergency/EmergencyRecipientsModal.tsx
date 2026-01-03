// src/features/emergency/EmergencyRecipientsModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
} from "react-native";
import type { Contact } from "@/src/features/contacts/types";

const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

type Props = {
  visible: boolean;
  contacts: Contact[];
  maxSelectable: number;
  onCancel: () => void;
  onConfirm: (selected: Contact[]) => Promise<void> | void;
};

export function EmergencyRecipientsModal({
  visible,
  contacts,
  maxSelectable,
  onCancel,
  onConfirm,
}: Props) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset selection whenever modal opens/closes so it feels clean
  React.useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setIsSubmitting(false);
    }
  }, [visible]);

  const selectedContacts = React.useMemo(() => {
    if (selectedIds.size === 0) return [];
    const map = new Set(selectedIds);
    return contacts.filter((c) => map.has(c.id));
  }, [contacts, selectedIds]);

  function toggle(contactId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(contactId)) {
        next.delete(contactId);
        return next;
      }

      if (next.size >= maxSelectable) return next; // enforce limit
      next.add(contactId);
      return next;
    });
  }

  async function handleConfirm() {
    if (selectedContacts.length === 0) return;

    try {
      setIsSubmitting(true);
      await onConfirm(selectedContacts);
    } finally {
      setIsSubmitting(false);
    }
  }

  const limitText =
    maxSelectable >= 10
      ? `Select up to ${maxSelectable}`
      : `Select up to ${maxSelectable}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>

        {/* Backdrop is a separate absolute Pressable BEHIND the card.
            This prevents it from stealing touches inside the card. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        {/* Card sits above backdrop and receives touches normally */}
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Emergency recipients</Text>
            <Text style={styles.subtitle}>
              {limitText} • {selectedContacts.length}/{maxSelectable} selected
            </Text>
          </View>

          {contacts.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No trusted contacts</Text>
              <Text style={styles.emptyText}>
                Add trusted contacts first, then start Emergency.
              </Text>
            </View>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 10, gap: 10 }}
              renderItem={({ item }) => {
                const isSelected = selectedIds.has(item.id);
                const isAtLimit = !isSelected && selectedIds.size >= maxSelectable;

                return (
                  <Pressable
                    onPress={() => toggle(item.id)}
                    disabled={isAtLimit || isSubmitting}
                    style={[
                      styles.row,
                      isSelected && styles.rowSelected,
                      (isAtLimit || isSubmitting) && { opacity: 0.55 },
                    ]}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.name}>{item.name}</Text>
                      <Text style={styles.meta}>
                        {item.phone ? item.phone : "No phone"}
                        {item.email ? ` • ${item.email}` : ""}
                      </Text>
                    </View>

                    <View style={[styles.check, isSelected && styles.checkOn]}>
                      <Text style={styles.checkText}>
                        {isSelected ? "✓" : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          <View style={styles.footer}>
            <Pressable
              onPress={onCancel}
              disabled={isSubmitting}
              style={[styles.btn, styles.btnGhost, isSubmitting && { opacity: 0.6 }]}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={selectedContacts.length === 0 || isSubmitting}
              style={[
                styles.btn,
                styles.btnDanger,
                (selectedContacts.length === 0 || isSubmitting) && { opacity: 0.55 },
              ]}
            >
              <Text style={styles.btnDangerText}>
                {isSubmitting ? "Starting…" : "Start Emergency"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {Platform.OS === "web"
              ? "Tip: Click outside this panel to close."
              : "Tip: Tap outside to close."}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  header: { gap: 6 },
  title: { color: "#fff", fontWeight: "900", fontSize: 16 },
  subtitle: { color: MUTED, fontSize: 12, lineHeight: 16 },

  empty: { paddingVertical: 18, gap: 6 },
  emptyTitle: { color: "#fff", fontWeight: "900", fontSize: 14 },
  emptyText: { color: MUTED, fontSize: 12, lineHeight: 16 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  rowSelected: {
    borderColor: "rgba(56,150,255,0.55)",
    backgroundColor: "rgba(56,150,255,0.10)",
  },
  name: { color: "#fff", fontWeight: "900", fontSize: 13 },
  meta: { color: MUTED, fontSize: 12 },

  check: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkOn: {
    borderColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.18)",
  },
  checkText: { color: "#fff", fontWeight: "900" },

  footer: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  btnGhost: { borderColor: BORDER, backgroundColor: "transparent" },
  btnGhostText: { color: MUTED, fontWeight: "900" },
  btnDanger: { borderColor: DANGER, backgroundColor: "rgba(255,75,92,0.14)" },
  btnDangerText: { color: "#fff", fontWeight: "900" },

  hint: {
    marginTop: 10,
    color: MUTED,
    fontSize: 11,
    textAlign: "right",
  },
});
