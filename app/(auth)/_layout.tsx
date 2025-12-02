// app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function AuthLayout() {
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
