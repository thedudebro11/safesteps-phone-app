// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff3b4e";

// The three core privacy principles — shown above the form to set expectations
// before the user interacts with the product.
const PRINCIPLES = [
  { text: "Share your location only when you choose to", color: ACCENT },
  { text: "Trust is mutual — both sides must accept", color: ACCENT },
  { text: "Emergency mode is always distinct and serious", color: DANGER },
] as const;

export default function LoginScreen() {
  const { signInWithEmail, isAuthActionLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ Logic unchanged
  const handleLogin = async () => {
    if (!email || !password) return;
    await signInWithEmail(email.trim(), password);
    // RootNavigator redirect will handle routing after auth state updates
  };

  const handleGoToRegister = () => {
    router.push("/register");
  };

  const disableAuthButtons = isAuthActionLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Brand header ──────────────────────────────────────────────── */}
        {/* Sets the product tone before the user engages with the form.
            Three principles communicate the privacy model at a glance.     */}
        <View style={styles.brand}>
          <Text style={styles.wordmark}>SafeSteps</Text>
          <Text style={styles.tagline}>Your location. Your choice.</Text>

          <View style={styles.principles}>
            {PRINCIPLES.map(({ text, color }, i) => (
              <View key={i} style={styles.principleRow}>
                <View style={[styles.principleDot, { backgroundColor: color }]} />
                <Text style={styles.principleText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Sign in form — logic and structure unchanged ──────────────── */}
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
            style={[styles.primaryButton, disableAuthButtons && styles.disabled]}
            onPress={handleLogin}
            disabled={disableAuthButtons}
          >
            <Text style={styles.primaryButtonText}>
              {isAuthActionLoading ? "Signing in…" : "Sign In"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleGoToRegister}
            disabled={disableAuthButtons}
          >
            <Text style={styles.secondaryButtonText}>Create an account</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 24,
    flexGrow: 1,
  },

  // ── Brand header
  brand: { gap: 8 },

  wordmark: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  tagline: {
    color: MUTED,
    fontSize: 16,
    fontWeight: "600",
  },

  // Privacy principles — informational, intentionally subtle
  principles: {
    marginTop: 14,
    gap: 10,
  },
  principleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  principleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    flexShrink: 0,
  },
  principleText: {
    color: "#5f6b86",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },

  // ── Form card — unchanged from original
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
  label: { color: MUTED, fontSize: 13 },
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
  disabled: { opacity: 0.6 },
});
