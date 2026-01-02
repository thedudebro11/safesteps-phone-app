// src/lib/confirm.ts
import { Alert, Platform } from "react-native";

export async function confirm(
  title: string,
  message: string,
  confirmText = "OK",
  cancelText = "Cancel"
): Promise<boolean> {
  // Web: use native confirm dialog
  if (Platform.OS === "web") {
    // window.confirm ignores title, so include it in message
    return window.confirm(`${title}\n\n${message}`);
  }

  // Native: use Alert.alert but return a Promise
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
