// app/(tabs)/settings.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function SettingsScreen() {
  const { user, signOut, isAuthActionLoading } = useAuth();

  const handleLogout = async () => {
  console.log("[Settings] Log Out pressed");

  try {
    await signOut();
    console.log("[Settings] signOut() completed");
    // Tabs layout + auth layout will see user=null and redirect to /login
  } catch (err) {
    console.error("[Settings] signOut() failed:", err);
  }
};


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>
            {user?.email ?? "Unknown user (no email)"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Data & Safety</Text>
          <Text style={styles.bodyText}>
            SafeSteps only uses your location to create pings you control.
            Future versions will include a detailed “How your data is handled”
            page here.
          </Text>
        </View>

        <Pressable
          // ⚠️ For now we ignore isAuthActionLoading so we can prove the press works
          style={[
            styles.logoutButton,
            isAuthActionLoading && styles.disabled, // just visual
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>
            {isAuthActionLoading ? "Logging out..." : "Log Out"}
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
