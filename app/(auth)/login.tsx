import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Log In</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#7780a0"
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

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Log In</Text>
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
});
