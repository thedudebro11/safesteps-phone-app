// app/_layout.tsx
import "react-native-gesture-handler";
// Must be imported before any navigation so the background task is registered on startup.
import "@/src/lib/backgroundLocationTask";

import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useSegments, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { PremiumProvider } from "@/src/features/premium/PremiumProvider";
import { TrackingProvider } from "@/src/features/tracking/TrackingProvider";
import { ContactsProvider } from "@/src/features/contacts/ContactsProvider";
import { SharesProvider } from "@/src/features/shares/SharesProvider";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

function RootNavigator() {
  const { hasSession, isAuthActionLoading } = useAuth();
  const segments = useSegments();

  if (isAuthActionLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  const inAuthGroup = segments[0] === "(auth)";

  if (!hasSession && !inAuthGroup) return <Redirect href="/(auth)/login" />;
  if (hasSession && inAuthGroup) return <Redirect href="/(tabs)/home" />;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <PremiumProvider>
          <ContactsProvider>
            <SharesProvider>
              <TrackingProvider>
                <RootNavigator />
              </TrackingProvider>
            </SharesProvider>
          </ContactsProvider>
          </PremiumProvider>
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