// app/_layout.tsx
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { TrackingProvider } from "@/src/features/tracking/TrackingProvider";
import { ContactsProvider } from "@/src/features/contacts/ContactsProvider";
import { SharesProvider } from "@/src/features/shares/SharesProvider";


function RootNavigator() {
  const { isAuthLoaded, hasSession } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isAuthLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!hasSession && !inAuthGroup) {
      // No session → force auth stack
      router.replace("/login");
    } else if (hasSession && inAuthGroup) {
      // Have session (guest or user) but stuck in auth → send to tabs
      router.replace("/home");
    }
  }, [isAuthLoaded, hasSession, segments, router]);

  if (!isAuthLoaded) {
    // Simple splash while we figure out auth state
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
      <ContactsProvider>
        <SharesProvider>
          <TrackingProvider>
            <RootNavigator />
          </TrackingProvider>
        </SharesProvider>
      </ContactsProvider>
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
