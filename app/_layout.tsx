// app/_layout.tsx
import React from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useSegments, Redirect } from "expo-router";
import { AuthProvider, useAuth } from "@/src/features/auth/AuthProvider";
import { TrackingProvider } from "@/src/features/tracking/TrackingProvider";
import { ContactsProvider } from "@/src/features/contacts/ContactsProvider";
import { SharesProvider } from "@/src/features/shares/SharesProvider";

function RootNavigator() {
  const { isAuthLoaded, hasSession } = useAuth();
  const segments = useSegments();

  if (!isAuthLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
      </View>
    );
  }

  const inAuthGroup = segments[0] === "(auth)";

  // Not logged in (no guest + no user) → force /login
  if (!hasSession && !inAuthGroup) {
    return <Redirect href="/login" />;
  }

  // Logged in but currently on auth screens → send to tabs/home
  if (hasSession && inAuthGroup) {
    return <Redirect href="/home" />;
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
