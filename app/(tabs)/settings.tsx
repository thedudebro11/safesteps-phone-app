// app/(tabs)/settings.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";

import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function SettingsScreen() {
  const { user, signOut, endGuestSession, isAuthActionLoading, isGuest } = useAuth();

  const handleLogout = async () => {
    console.log("[Settings] Logout button pressed", { isGuest, isAuthActionLoading });

    try {
      if (isGuest) {
        await endGuestSession();
        console.log("[Settings] endGuestSession() completed");
        return; // _layout Redirect will take over
      }

      await signOut();
      console.log("[Settings] signOut() completed");
      return; // _layout Redirect will take over
    } catch (err) {
      console.error("[Settings] Error during logout:", err);
    }
  };


  const primaryLabel = isGuest
    ? "Guest session (local only)"
    : user?.email ?? "Unknown user";

  const secondaryText = isGuest
    ? "You’re using SafeSteps without an account. Location and history stay on this device only."
    : "Your account uses Supabase Auth. In future versions, this will sync trusted contacts and history securely across devices.";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>{primaryLabel}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Safety</Text>
          <Text style={styles.bodyText}>
            SafeSteps only sends pings you explicitly enable.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 6 }]}>
            {secondaryText}
          </Text>
        </View>

        <Pressable
          style={[
            styles.logoutButton,
            isAuthActionLoading && styles.disabled,
          ]}
          onPress={handleLogout}
          disabled={isAuthActionLoading}
        >
          <Text style={styles.logoutText}>
            {isAuthActionLoading
              ? isGuest
                ? "Exiting…"
                : "Logging out..."
              : isGuest
                ? "Exit Guest Mode"
                : "Log Out"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    color: MUTED,
    fontSize: 13,
  },
  value: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  bodyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  logoutButton: {
    marginTop: "auto",
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: DANGER,
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
