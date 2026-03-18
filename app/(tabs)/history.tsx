// app/(tabs)/history.tsx
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useHistory } from "@/src/features/history/useHistory";
import type { HistoryItem, HistoryModeFilter, HistoryRangePreset } from "@/src/features/history/types";
import { useFocusEffect } from "expo-router";
import { useTracking } from "@/src/features/tracking/TrackingProvider";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BG = "#050814";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff3b4e";

// ─── Timestamp formatter ──────────────────────────────────────────────────────
// Replaces toLocaleString() — produces "Today · 2:34 PM", "Mar 14 · 9:05 AM", etc.
function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();

  const timePart = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (d.toDateString() === now.toDateString()) {
    return `Today · ${timePart}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday · ${timePart}`;
  }

  const datePart = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${datePart} · ${timePart}`;
}

// ─── Filter pill ──────────────────────────────────────────────────────────────
function Pill({
  label,
  active,
  danger,
  onPress,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        active
          ? danger
            ? styles.pillActiveDanger
            : styles.pillActiveDefault
          : styles.pillInactive,
      ]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────
// One ping per card. Mode badge leads; timestamp trails; coordinates are secondary.
function EntryCard({ item }: { item: HistoryItem }) {
  const isEmergency = item.mode === "emergency";
  const coordLabel = `${item.lat.toFixed(5)}, ${item.lng.toFixed(5)}`;
  const accuracyLabel =
    item.accuracy_m != null ? ` · ±${Math.round(item.accuracy_m)}m` : "";

  return (
    <View style={[styles.entry, isEmergency ? styles.entryEmergency : styles.entryActive]}>
      {/* Top line: colored dot + mode label + timestamp */}
      <View style={styles.entryTop}>
        <View style={styles.modeRow}>
          <View style={[styles.dot, isEmergency ? styles.dotEmergency : styles.dotActive]} />
          <Text
            style={[
              styles.modeLabel,
              isEmergency ? styles.modeLabelEmergency : styles.modeLabelActive,
            ]}
          >
            {isEmergency ? "Emergency" : "Active"}
          </Text>
        </View>
        <Text style={styles.entryTime}>{fmtTimestamp(item.created_at)}</Text>
      </View>

      {/* Second line: coordinates + accuracy — clearly secondary */}
      <Text style={styles.entryCoords}>
        {coordLabel}
        {accuracyLabel}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { items, isLoading, error, filters, setRange, setMode, refetch } = useHistory();
  const { mode } = useTracking();

  // ✅ Unchanged — silent background refresh while focused
  useFocusEffect(
    useCallback(() => {
      refetch({ silent: true });
      const intervalMs = mode === "idle" ? 30_000 : 6_000;
      const id = setInterval(() => {
        refetch({ silent: true });
      }, intervalMs);
      return () => clearInterval(id);
    }, [refetch, mode])
  );

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

  // Empty / loading component rendered by FlatList when data is absent
  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.stateText}>Loading history…</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No entries</Text>
        <Text style={styles.emptyBody}>
          No location pings found for this period.{"\n"}
          Try a wider range, or start sharing your location.
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outer}>

        {/* ── Fixed header section ────────────────────────────────────────── */}
        <View style={styles.headerSection}>

          {/* Title + refresh */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>History</Text>
              <Text style={styles.subtitle}>Your past location pings.</Text>
            </View>
            {/* Refresh is secondary — muted, not the primary CTA */}
            <Pressable
              onPress={() => refetch({ silent: false })}
              style={styles.refreshBtn}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </Pressable>
          </View>

          {/* Error banner — shown here, not buried inside the list */}
          {error ? (
            <View style={styles.bannerDanger}>
              <Text style={styles.bannerDangerText}>{String(error)}</Text>
            </View>
          ) : null}

          {/* Range filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Range</Text>
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
          </View>

          {/* Mode filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Mode</Text>
            <View style={styles.pillRow}>
              {modes.map((m) => (
                <Pill
                  key={m.key}
                  label={m.label}
                  active={filters.mode === m.key}
                  // Emergency pill gets red accent when selected
                  danger={m.key === "emergency"}
                  onPress={() => setMode(m.key)}
                />
              ))}
            </View>
          </View>

          {/* Separator + optional entry count */}
          {!isLoading && items.length > 0 ? (
            // Count flanked by divider lines
            <View style={styles.countRow}>
              <View style={styles.divider} />
              <Text style={styles.countText}>
                {items.length} {items.length === 1 ? "entry" : "entries"}
              </Text>
              <View style={styles.divider} />
            </View>
          ) : (
            // Plain divider when loading or empty
            <View style={styles.divider} />
          )}
        </View>

        {/* ── Scrollable entry list — takes all remaining height ───────────── */}
        <FlatList
          data={items}
          // ✅ Unchanged keyExtractor
          keyExtractor={(it) =>
            String(it.id ?? `${it.created_at}-${it.lat}-${it.lng}`)
          }
          renderItem={({ item }) => <EntryCard item={item} />}
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  // outer fills the safe area and gives FlatList a defined flex context
  outer: { flex: 1 },

  // ── Fixed header
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 14,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: MUTED, fontSize: 13, marginTop: 3 },

  // De-emphasized: muted border, muted text — not a primary action
  refreshBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshText: { color: MUTED, fontWeight: "800", fontSize: 13 },

  // Error banner
  bannerDanger: {
    borderWidth: 1,
    borderColor: "rgba(255,59,78,0.4)",
    backgroundColor: "rgba(255,59,78,0.10)",
    borderRadius: 14,
    padding: 12,
  },
  bannerDangerText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // ── Filters
  filterGroup: { gap: 8 },
  filterLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  pillInactive: { borderColor: BORDER, backgroundColor: "transparent" },
  pillActiveDefault: {
    borderColor: "rgba(56,150,255,0.5)",
    backgroundColor: "rgba(56,150,255,0.14)",
  },
  // Emergency mode pill uses red when active
  pillActiveDanger: {
    borderColor: "rgba(255,59,78,0.5)",
    backgroundColor: "rgba(255,59,78,0.12)",
  },
  pillText: { color: MUTED, fontSize: 12, fontWeight: "800" },
  pillTextActive: { color: "#fff" },

  // ── Count row (divider + entry count)
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  countText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 0,
  },

  // ── FlatList
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 8,
  },

  // ── Entry card
  // Left-accent border immediately signals mode on scan
  entry: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderLeftWidth: 3,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 14,
    gap: 6,
  },
  entryActive: {
    borderLeftColor: ACCENT,
    backgroundColor: "rgba(56,150,255,0.04)",
  },
  entryEmergency: {
    borderLeftColor: DANGER,
    backgroundColor: "rgba(255,59,78,0.05)",
  },

  // Mode row: colored dot + label
  entryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: ACCENT },
  dotEmergency: { backgroundColor: DANGER },

  modeLabel: { fontSize: 13, fontWeight: "800" },
  modeLabelActive: { color: ACCENT },
  modeLabelEmergency: { color: DANGER },

  // Timestamp: right-aligned, muted — supporting info
  entryTime: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },

  // Coordinates: clearly tertiary — darkest muted shade
  entryCoords: { color: "#4a5578", fontSize: 11, fontWeight: "600" },

  // ── Empty state
  centeredState: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  stateText: { color: MUTED, fontSize: 13 },

  emptyState: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: MUTED, fontSize: 14, fontWeight: "800" },
  emptyBody: {
    color: "#4a5578",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
});
