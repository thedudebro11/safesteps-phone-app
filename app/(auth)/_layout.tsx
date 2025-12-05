// app/(auth)/_layout.tsx
import { Stack, Redirect } from "expo-router";
import React from "react";
import { useAuth } from "@/src/features/auth/AuthProvider";

export default function AuthLayout() {
  const { user, isInitialLoading } = useAuth();

  if (isInitialLoading) {
    return null;
  }

  if (user) {
    // Logged-in users should not see login/register
    return <Redirect href="/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#050814" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontSize: 20, fontWeight: "600" },
      }}
    />
  );
}
