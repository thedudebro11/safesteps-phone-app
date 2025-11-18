// app/index.tsx

import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";

export default function Index() {
  const handlePrimaryPress = () => {
    // later: navigate to login or main app
    console.log("Primary action pressed");
  };

  const handleSecondaryPress = () => {
    // later: maybe open a "Quick demo" or info screen
    console.log("Secondary action pressed");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.container}>
        {/* Top: Logo / Brand */}
        <View style={styles.header}>
          <Text style={styles.appName}>SafeSteps</Text>
          <Text style={styles.tagline}>
            Privacy-first live tracking & emergency alerts.
          </Text>
        </View>

        {/* Middle: Status card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking Status</Text>
          <Text style={styles.cardSubtitle}>No active tracking.</Text>
          <Text style={styles.cardBody}>
            Start Active Tracking to send encrypted location pings to your
            trusted contacts, or trigger Emergency Mode when you feel unsafe.
          </Text>
        </View>

        {/* Bottom: Primary actions */}
        <View style={styles.actions}>
          <Pressable style={styles.primaryButton} onPress={handlePrimaryPress}>
            <Text style={styles.primaryButtonText}>Log In / Sign Up</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleSecondaryPress}
          >
            <Text style={styles.secondaryButtonText}>
              Continue as Guest (Demo)
            </Text>
          </Pressable>

          <Text style={styles.helperText}>
            Next steps: this will route into your main Home screen with live
            map, Trusted Contacts, Ping History, and Settings tabs.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#3896ff";
const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const MUTED = "#a6b1cc";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: BG,
    justifyContent: "space-between",
  },
  header: {
    gap: 8,
    marginTop: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#ffffff",
  },
  tagline: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: ACCENT,
  },
  cardBody: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  secondaryButtonText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    textAlign: "center",
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
});
