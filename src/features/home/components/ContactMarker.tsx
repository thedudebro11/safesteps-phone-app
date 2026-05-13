// src/features/home/components/ContactMarker.tsx
import React, { useEffect, useRef } from "react";
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Callout, Marker } from "react-native-maps";

type Props = {
  userId: string;
  lat: number;
  lng: number;
  mode: "active" | "emergency";
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function openDirections(lat: number, lng: number) {
  const native = Platform.select({
    ios: `maps:0,0?q=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}`,
  });
  const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  if (native) {
    void Linking.openURL(native).catch(() => void Linking.openURL(fallback));
  } else {
    void Linking.openURL(fallback);
  }
}

export default function ContactMarker({ userId, lat, lng, mode, displayName, email, avatarUrl }: Props) {
  const isEmergency = mode === "emergency";
  const borderColor = isEmergency ? "#ff3b4e" : "#34d399";
  const label = displayName || email || "Contact";
  const initial = label[0].toUpperCase();

  // Pulse border opacity for emergency markers
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isEmergency) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isEmergency, pulseAnim]);

  return (
    <Marker
      key={userId}
      coordinate={{ latitude: lat, longitude: lng }}
      tracksViewChanges={isEmergency}
      anchor={{ x: 0.5, y: 1 }}
      calloutAnchor={{ x: 0.5, y: 0 }}
    >
      {/* ── Custom pin view ── */}
      <View style={styles.pinWrap}>
        {/* Outer pulse ring — only visible for emergency */}
        {isEmergency && (
          <Animated.View style={[styles.pulseRing, { opacity: pulseAnim }]} />
        )}

        {/* Avatar circle */}
        <View style={[styles.avatarCircle, { borderColor }]}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.initialsCircle, { backgroundColor: isEmergency ? "#3a0a10" : "#0a1f14" }]}>
              <Text style={[styles.initial, { color: borderColor }]}>{initial}</Text>
            </View>
          )}
        </View>

        {/* Name label below avatar */}
        <View style={styles.namePill}>
          <Text style={styles.nameText} numberOfLines={1}>{label}</Text>
        </View>

        {/* Stem */}
        <View style={[styles.stem, { backgroundColor: borderColor }]} />
      </View>

      {/* ── Callout (native popup on tap) ── */}
      <Callout tooltip onPress={() => openDirections(lat, lng)}>
        <View style={styles.callout}>
          <Text style={styles.calloutName} numberOfLines={1}>{label}</Text>
          <View style={[styles.calloutBadge, { borderColor, backgroundColor: isEmergency ? "rgba(255,59,78,0.12)" : "rgba(52,211,153,0.10)" }]}>
            <View style={[styles.calloutDot, { backgroundColor: borderColor }]} />
            <Text style={[styles.calloutStatus, { color: borderColor }]}>
              {isEmergency ? "Emergency" : "Live"}
            </Text>
          </View>
          <View style={styles.calloutDivider} />
          <Text style={styles.calloutAction}>Tap to get directions →</Text>
        </View>
      </Callout>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: "center",
  },

  // Emergency pulse ring behind the avatar
  pulseRing: {
    position: "absolute",
    top: -6,
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#ff3b4e",
  },

  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    overflow: "hidden",
    backgroundColor: "#0c1020",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  initialsCircle: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  initial: {
    fontSize: 18,
    fontWeight: "900",
  },

  namePill: {
    marginTop: 3,
    backgroundColor: "rgba(5,8,20,0.88)",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    maxWidth: 100,
  },

  nameText: {
    color: "#e7ecff",
    fontSize: 10,
    fontWeight: "700",
  },

  stem: {
    width: 2,
    height: 6,
    marginTop: 1,
    borderRadius: 1,
  },

  // Callout card
  callout: {
    backgroundColor: "#0c1020",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1a2035",
    padding: 14,
    minWidth: 160,
    maxWidth: 220,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  calloutName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  calloutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },

  calloutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  calloutStatus: {
    fontSize: 11,
    fontWeight: "800",
  },

  calloutDivider: {
    height: 1,
    backgroundColor: "#1a2035",
  },

  calloutAction: {
    color: "#3896ff",
    fontSize: 12,
    fontWeight: "700",
  },
});
