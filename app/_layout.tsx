// app/_layout.tsx
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import {
  AuthProvider,
  useAuth,
} from "@/src/features/auth/AuthProvider";
import { ActivityIndicator, View } from "react-native";

function RootNavigator() {
  const { isAuthLoaded, hasSession } = useAuth();
  const router = useRouter();

  // Hard-sync URL with auth state
  useEffect(() => {
    if (!isAuthLoaded) return;

    if (!hasSession) {
      // No user + not guest → force them to auth
      router.replace("/login");
    } else {
      // Guest or authenticated user → main app
      router.replace("/home");
    }
  }, [isAuthLoaded, hasSession, router]);

  if (!isAuthLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#050814",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Two high-level groups: auth screens and tabs */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
