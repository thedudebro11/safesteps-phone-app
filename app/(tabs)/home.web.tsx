import React from "react";
import { SafeAreaView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050814" }}>
      <View style={{ padding: 20, gap: 10 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
          SafeSteps (Web)
        </Text>
        <Text style={{ color: "#a6b1cc", fontSize: 13, lineHeight: 18 }}>
          The live map is mobile-only right now. Open this app on iOS/Android to use the
          map-first home screen and tracking controls.
        </Text>
      </View>
    </SafeAreaView>
  );
}
