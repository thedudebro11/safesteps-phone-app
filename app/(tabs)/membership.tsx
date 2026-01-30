import React from "react";
import { SafeAreaView, Text, View } from "react-native";

export default function MembershipScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#050814" }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
          Membership
        </Text>
        <Text style={{ color: "#a6b1cc", marginTop: 8 }}>
          Coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
