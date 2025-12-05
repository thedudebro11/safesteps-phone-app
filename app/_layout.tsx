// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { View, ActivityIndicator, StyleSheet } from "react-native";

function RootGate() {
  const { isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050814",
    alignItems: "center",
    justifyContent: "center",
  },
});
