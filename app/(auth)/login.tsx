// app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/features/auth/AuthProvider";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isAuthActionLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorText(null);
    const { error } = await signIn(email.trim(), password);

    if (error) {
      setErrorText(error);
      return;
    }

    // Auth layout will redirect once user is set,
    // but we can also be explicit:
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Log In</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7780a0"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#7780a0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorText && <Text style={styles.errorText}>{errorText}</Text>}

        <Pressable
          style={[
            styles.primaryButton,
            isAuthActionLoading && styles.primaryButtonDisabled,
          ]}
          onPress={handleLogin}
          disabled={isAuthActionLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthActionLoading ? "Logging in..." : "Log In"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/register")}>
          <Text style={styles.link}>Create an account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const ACCENT = "#3896ff";
const BG = "#050814";
const BORDER = "#1a2035";
const MUTED = "#a6b1cc";
const ERROR = "#ff4b5c";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 22,
    justifyContent: "center",
    gap: 16,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#0c1020",
    color: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  link: {
    color: ACCENT,
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
  },
  errorText: {
    color: ERROR,
    fontSize: 13,
    marginTop: 4,
  },
});
