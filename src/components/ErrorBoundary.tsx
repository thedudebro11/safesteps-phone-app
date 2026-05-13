// src/components/ErrorBoundary.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary] caught:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Something went wrong. Pull to refresh.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050814",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: { color: "#a6b1cc", fontSize: 14, textAlign: "center" },
});
