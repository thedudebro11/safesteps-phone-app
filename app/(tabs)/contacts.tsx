// app/(tabs)/contacts.tsx

import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function ContactsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Trusted Contacts</Text>
        <Text style={styles.subtitle}>
          Here you’ll add and manage the people who can see your live location
          or receive emergency alerts.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const BG = "#050814";
const MUTED = "#a6b1cc";

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
});
