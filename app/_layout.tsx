// app/_layout.tsx
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";

import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { TrackingProvider } from "@/src/features/tracking/TrackingProvider";

function RootNavigator() {
  const { isAuthLoaded, hasSession } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isAuthLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!hasSession && !inAuthGroup) {
      router.replace("/login");
    } else if (hasSession && inAuthGroup) {
      router.replace("/home");
    }
  }, [isAuthLoaded, hasSession, segments, router]);

  if (!isAuthLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TrackingProvider>
        <RootNavigator />
      </TrackingProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: "#050814",
    alignItems: "center",
    justifyContent: "center",
  },
});
