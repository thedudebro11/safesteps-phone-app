// app/(tabs)/history.tsx
import React, { useMemo } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useHistory } from "@/src/features/history/useHistory";
import type { HistoryModeFilter, HistoryRangePreset } from "@/src/features/history/types";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active ? styles.pillActive : styles.pillInactive,
      ]}
    >
      <Text style={[styles.pillText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const { items, isLoading, error, filters, setRange, setMode, refetch } = useHistory();

  const headerText = useMemo(() => {
    if (isLoading) return "Loading history…";
    if (error) return "History (error)";
    return "History";
  }, [isLoading, error]);

  const ranges: Array<{ key: HistoryRangePreset; label: string }> = [
    { key: "today", label: "Today" },
    { key: "7d", label: "7 days" },
    { key: "30d", label: "30 days" },
  ];

  const modes: Array<{ key: HistoryModeFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "emergency", label: "Emergency" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{headerText}</Text>
            <Text style={styles.subtitle}>
              Your past pings. Emergency is clearly labeled.
            </Text>
          </View>

          <Pressable onPress={refetch} style={styles.refreshBtn}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Filters</Text>

          <View style={styles.pillRow}>
            {ranges.map((r) => (
              <Pill
                key={r.key}
                label={r.label}
                active={filters.range === r.key}
                onPress={() => setRange(r.key)}
              />
            ))}
          </View>

          <View style={[styles.pillRow, { marginTop: 10 }]}>
            {modes.map((m) => (
              <Pill
                key={m.key}
                label={m.label}
                active={filters.mode === m.key}
                onPress={() => setMode(m.key)}
              />
            ))}
          </View>

          {error ? (
            <Text style={[styles.bodyText, { marginTop: 10 }]}>
              {String(error)}
            </Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entries</Text>

          {isLoading ? (
            <Text style={styles.bodyText}>Loading…</Text>
          ) : items.length === 0 ? (
            <Text style={styles.bodyText}>No history yet.</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ paddingTop: 12, gap: 10 }}
              renderItem={({ item }) => {
                const danger = item.mode === "emergency";

                return (
                  <View style={styles.row}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.rowTop}>
                        <Text style={styles.rowTime}>{fmtTime(item.created_at)}</Text>
                        <View style={[styles.badge, danger ? styles.badgeDanger : styles.badgeActive]}>
                          <Text style={styles.badgeText}>
                            {danger ? "EMERGENCY" : "ACTIVE"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.rowMeta}>
                        {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                        {item.accuracy_m != null ? ` • ±${Math.round(item.accuracy_m)}m` : ""}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
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
  refreshText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  bodyText: { color: MUTED, fontSize: 13, marginTop: 10, lineHeight: 18 },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  pill: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  pillActive: { borderColor: ACCENT, backgroundColor: "rgba(56,150,255,0.16)" },
  pillInactive: { borderColor: BORDER, backgroundColor: "transparent" },
  pillText: { color: MUTED, fontSize: 12, fontWeight: "900" },

  row: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rowTime: { color: "#fff", fontWeight: "900", fontSize: 13 },
  rowMeta: { color: MUTED, fontSize: 12 },

  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: { borderColor: "rgba(56,150,255,0.5)", backgroundColor: "rgba(56,150,255,0.14)" },
  badgeDanger: { borderColor: "rgba(255,75,92,0.5)", backgroundColor: "rgba(255,75,92,0.14)" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
});