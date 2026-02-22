// app/_layout.tsx
import "react-native-gesture-handler";

import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useSegments, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { TrackingProvider } from "@/src/features/tracking/TrackingProvider";
import { ContactsProvider } from "@/src/features/contacts/ContactsProvider";
import { SharesProvider } from "@/src/features/shares/SharesProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootNavigator() {
  const { isAuthenticated, isAuthActionLoading, session } = useAuth();
  const segments = useSegments();

  // During initial hydration or any auth action, show splash
  if (isAuthActionLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  const inAuthGroup = segments[0] === "(auth)";

  // Not signed in -> force auth group
  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // Signed in -> keep them out of auth group
  if (isAuthenticated && inAuthGroup) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Optional: extra safety (session should exist if authenticated)
  // If you ever want: if (!session && isAuthenticated) show splash.
  void session;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ContactsProvider>
            <SharesProvider>
              <TrackingProvider>
                <RootNavigator />
              </TrackingProvider>
            </SharesProvider>
          </ContactsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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