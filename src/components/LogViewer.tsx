// src/components/LogViewer.tsx
// Secret debug log viewer. Open by tapping version number 7 times in Settings.
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  clearLogs,
  formatEntry,
  getLogEntries,
  subscribeToLogs,
} from "@/src/lib/logger";

type Level = "info" | "warn" | "error";
type Filter = "all" | Level;

const LEVEL_COLOR: Record<Level, string> = {
  error: "#ff4b5c",
  warn:  "#fbbf24",
  info:  "#c8d1e0",
};
const TAG_BG: Record<Level, string> = {
  error: "#2d0a0e",
  warn:  "#2d1e00",
  info:  "#0c1120",
};

export default function LogViewer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [entries, setEntries] = useState(() => [...getLogEntries()].reverse());
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!visible) return;
    setEntries([...getLogEntries()].reverse());
    return subscribeToLogs(() => setEntries([...getLogEntries()].reverse()));
  }, [visible]);

  const displayed = filter === "all" ? entries : entries.filter((e) => e.level === filter);

  const handleShare = useCallback(async () => {
    const text = [...displayed].reverse().map(formatEntry).join("\n");
    await Share.share({ message: text, title: "Lume Debug Logs" }).catch(() => {});
  }, [displayed]);

  const handleClear = useCallback(() => {
    clearLogs();
    setEntries([]);
  }, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <Text style={s.title}>Debug Logs</Text>
          <View style={s.headerBtns}>
            <Pressable onPress={handleShare} style={s.hBtn}>
              <Text style={s.hBtnTxt}>Share</Text>
            </Pressable>
            <Pressable onPress={handleClear} style={[s.hBtn, { borderColor: "#ff4b5c" }]}>
              <Text style={[s.hBtnTxt, { color: "#ff4b5c" }]}>Clear</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[s.hBtn, { borderColor: "#334" }]}>
              <Text style={[s.hBtnTxt, { color: "#778" }]}>Close</Text>
            </Pressable>
          </View>
        </View>

        <View style={s.filterRow}>
          {(["all", "error", "warn", "info"] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[s.tab, filter === f && s.tabActive]}
            >
              <Text style={[s.tabTxt, filter === f && s.tabTxtActive]}>{f.toUpperCase()}</Text>
            </Pressable>
          ))}
          <Text style={s.count}>{displayed.length}</Text>
        </View>

        {displayed.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>No entries.</Text>
          </View>
        ) : (
          <FlatList
            data={displayed}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => {
              const c = LEVEL_COLOR[item.level];
              return (
                <View style={[s.row, { borderLeftColor: c }]}>
                  <View style={s.rowTop}>
                    <View style={[s.tagPill, { backgroundColor: TAG_BG[item.level] }]}>
                      <Text style={[s.tagTxt, { color: c }]}>{item.tag}</Text>
                    </View>
                    <Text style={[s.levelTxt, { color: c }]}>{item.level.toUpperCase()}</Text>
                    <Text style={s.ts}>
                      {new Date(item.ts).toLocaleTimeString([], {
                        hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={s.msg} selectable>{item.msg}</Text>
                  {item.extra ? <Text style={s.extra} selectable>{item.extra}</Text> : null}
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#050814" },
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderBottomWidth: 1, borderBottomColor: "#1a2035" },
  title:      { color: "#fff", fontWeight: "800", fontSize: 17 },
  headerBtns: { flexDirection: "row", gap: 8 },
  hBtn:       { borderWidth: 1, borderColor: "#3896ff", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  hBtnTxt:    { color: "#3896ff", fontSize: 12, fontWeight: "700" },
  filterRow:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a2035" },
  tab:        { borderWidth: 1, borderColor: "#1a2035", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tabActive:  { borderColor: "#3896ff", backgroundColor: "#0d1a30" },
  tabTxt:     { color: "#556", fontSize: 11, fontWeight: "700" },
  tabTxtActive: { color: "#3896ff" },
  count:      { marginLeft: "auto", color: "#556", fontSize: 11 },
  empty:      { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyTxt:   { color: "#445", fontSize: 14 },
  row:        { borderLeftWidth: 3, marginHorizontal: 10, marginTop: 6, paddingLeft: 10, paddingVertical: 6, backgroundColor: "#080d1a", borderRadius: 6 },
  rowTop:     { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  tagPill:    { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  tagTxt:     { fontSize: 10, fontWeight: "800" },
  levelTxt:   { fontSize: 10, fontWeight: "700" },
  ts:         { color: "#445", fontSize: 10, marginLeft: "auto" },
  msg:        { color: "#c8d1e0", fontSize: 12, lineHeight: 16 },
  extra:      { color: "#667", fontSize: 11, marginTop: 2, fontFamily: "monospace" },
});
