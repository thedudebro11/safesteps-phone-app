// app/(tabs)/settings.tsx

import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Theme, tracking options, delete history, account controls, and
          privacy settings will live here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const BG = "#050814";
const MUTED = "#a6b1cc";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
});
