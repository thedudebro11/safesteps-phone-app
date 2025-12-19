// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function LoginScreen() {
  const {
    signInWithEmail,
    startGuestSession,
    isAuthActionLoading,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return;

    try {
      await signInWithEmail(email.trim(), password);
      // Root layout + hasSession will keep user in tabs,
      // but this makes it snappy.
      router.replace("/home");
    } catch (err) {
      console.error("[Login] Error during sign in:", err);
      // You can add a toast/Alert here later
    }
  };

  const handleGuest = async () => {
    try {
      startGuestSession();
      router.replace("/home");
    } catch (err) {
      console.error("[Login] Error starting guest session:", err);
    }
  };

  const handleGoToRegister = () => {
    router.push("/register");
  };

  const disableAuthButtons = isAuthActionLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>SafeSteps</Text>
        <Text style={styles.subtitle}>Log in or continue as guest</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={MUTED}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[
              styles.primaryButton,
              disableAuthButtons && styles.disabled,
            ]}
            onPress={handleLogin}
            disabled={disableAuthButtons}
          >
            <Text style={styles.primaryButtonText}>
              {isAuthActionLoading ? "Signing in…" : "Sign In"}
            </Text>
          </Pressable>

          {/* NEW: Sign Up / Create account button */}
          <Pressable
            style={styles.secondaryButton}
            onPress={handleGoToRegister}
            disabled={disableAuthButtons}
          >
            <Text style={styles.secondaryButtonText}>
              Create an account
            </Text>
          </Pressable>
        </View>

        <View style={styles.guestCard}>
          <Text style={styles.guestTitle}>Just want to try it?</Text>
          <Text style={styles.guestText}>
            Use SafeSteps in guest mode. Data stays on this device only.
          </Text>

          <Pressable
            style={styles.guestButton}
            onPress={handleGuest}
            disabled={isAuthActionLoading}
          >
            <Text style={styles.guestButtonText}>
              {isAuthActionLoading ? "Starting…" : "Continue as Guest"}
            </Text>
          </Pressable>
        </View>
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
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    color: MUTED,
    fontSize: 13,
  },
  input: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: "#fff",
    backgroundColor: "#050814",
    fontSize: 14,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: "600",
  },
  guestCard: {
    marginTop: 20,
    backgroundColor: "transparent",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  guestTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  guestText: {
    color: MUTED,
    fontSize: 13,
  },
  guestButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DANGER,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  guestButtonText: {
    color: DANGER,
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
