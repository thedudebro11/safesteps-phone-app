// src/features/tracking/BackgroundPermissionModal.tsx
//
// Shown once when the user first starts tracking.
// Lets them choose between foreground-only or background tracking
// with an honest explanation of each option.

import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CARD = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";

type Props = {
  visible: boolean;
  onChooseForeground: () => void;
  onChooseBackground: () => void;
};

export function BackgroundPermissionModal({
  visible,
  onChooseForeground,
  onChooseBackground,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>How should tracking work?</Text>
          <Text style={styles.subtitle}>
            Choose how Lume tracks your location. You can change this later
            in Settings.
          </Text>

          <Pressable style={styles.option} onPress={onChooseForeground}>
            <View style={styles.iconWrap}>
              <Ionicons name="phone-portrait-outline" size={22} color={MUTED} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.optionTitle}>While Using App</Text>
              <Text style={styles.optionDesc}>
                Tracking only runs while this app is open on screen. Saves
                battery — but you can't use other apps while tracking.
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.option, styles.optionAccent]}
            onPress={onChooseBackground}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={ACCENT}
              />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.optionTitle}>
                Background{" "}
                <Text style={styles.recommended}>(Recommended)</Text>
              </Text>
              <Text style={styles.optionDesc}>
                Tracking continues even when you lock your phone or use other
                apps. Open Lume to stop it whenever you're ready.
              </Text>
            </View>
          </Pressable>

          <Text style={styles.hint}>
            Your location is only shared with people you choose. No silent
            tracking, ever.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 14,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  subtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  optionAccent: {
    borderColor: "rgba(56,150,255,0.4)",
    backgroundColor: "rgba(56,150,255,0.06)",
  },
  iconWrap: {
    paddingTop: 2,
  },
  textWrap: {
    flex: 1,
    gap: 5,
  },
  optionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  recommended: {
    color: ACCENT,
    fontWeight: "700",
    fontSize: 13,
  },
  optionDesc: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  hint: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    opacity: 0.7,
  },
});
