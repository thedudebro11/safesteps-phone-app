// app/(auth)/register.tsx
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

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, isAuthActionLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  const handleSignUp = async () => {
    setErrorText(null);
    setInfoText(null);

    const { error } = await signUp(email.trim(), password);

    if (error) {
      setErrorText(error);
      return;
    }

    setInfoText(
      "Account created. Check your email if confirmation is required."
    );
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

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
          secureTextEntry
          placeholderTextColor="#7780a0"
          value={password}
          onChangeText={setPassword}
        />

        {errorText && <Text style={styles.errorText}>{errorText}</Text>}
        {infoText && <Text style={styles.infoText}>{infoText}</Text>}

        <Pressable
          style={[
            styles.primaryButton,
            isAuthActionLoading && styles.primaryButtonDisabled,
          ]}
          onPress={handleSignUp}
          disabled={isAuthActionLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isAuthActionLoading ? "Creating account..." : "Sign Up"}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push("/login")}>
          <Text style={styles.link}>Already have an account?</Text>
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
  infoText: {
    color: MUTED,
    fontSize: 13,
    marginTop: 4,
  },
});
