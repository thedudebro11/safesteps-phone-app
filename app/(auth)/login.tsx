// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";

export default function LoginScreen() {
  const { signInWithEmail, isAuthActionLoading, startGuestSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) return;
    await signInWithEmail(email.trim(), password);
  };

  const handleGuest = () => {
    console.log("[Login] Continue as Guest pressed");
    startGuestSession();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SafeSteps</Text>
          <Text style={styles.subtitle}>
            Private-by-default safety. No account required to start.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={MUTED}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={MUTED}
          />

          <Pressable
            style={[
              styles.primaryButton,
              (!email || !password || isAuthActionLoading) && styles.disabled,
            ]}
            onPress={handleLogin}
            disabled={!email || !password || isAuthActionLoading}
          >
            <Text style={styles.primaryText}>
              {isAuthActionLoading ? "Signing in..." : "Sign In"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.dividerBlock}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.guestButton} onPress={handleGuest}>
          <Text style={styles.guestTitle}>Continue as Guest</Text>
          <Text style={styles.guestSubtitle}>
            No account. Location stays on this device unless you upgrade.
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            New here? Open the app as a guest now and create an account later
            if you want cloud backup, trusted contacts, or family maps.
          </Text>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 4,
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
    marginTop: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
  dividerBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    color: MUTED,
    fontSize: 12,
  },
  guestButton: {
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  guestTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  guestSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    marginTop: "auto",
  },
  footerText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
});
