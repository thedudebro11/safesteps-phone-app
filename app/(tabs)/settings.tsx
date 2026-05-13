// app/(tabs)/settings.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { usePremium } from "@/src/features/premium/PremiumProvider";
import { useTracking } from "@/src/features/tracking/TrackingProvider";
import { supabase } from "@/src/lib/supabase";
import { API_BASE_URL } from "@/src/lib/api";

// Pull version from package.json — kept separate to avoid circular import issues
const APP_VERSION = "1.0.0";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";
const DANGER = "#ff4b5c";

export default function SettingsScreen() {
  const { user, signOut, endGuestSession, isAuthActionLoading, isGuest, isAuthenticated } = useAuth();
  const { isPremium } = usePremium();
  const { stopAll } = useTracking();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setAvatarError("Photo library permission required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const userId = user?.id;
    if (!userId) return;

    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const bustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: bustedUrl })
        .eq("user_id", userId);

      if (profileError) throw profileError;
      setAvatarUrl(bustedUrl);
    } catch (e: any) {
      setAvatarError(e?.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const userId = user?.id;
    if (!userId) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
      setAvatarUrl(null);
    } catch (e: any) {
      setAvatarError(e?.message ?? "Failed to remove photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const tierLabel = isPremium ? "Premium" : isGuest ? "Guest" : "Free";

  const handleLogout = async () => {
    try {
      await stopAll();
      if (isGuest) {
        await endGuestSession();
      } else {
        await signOut();
      }
    } catch (err) {
      console.error("[Settings] logout error:", err);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const session = await import("@/src/lib/supabase").then((m) => m.supabase.auth.getSession());
      const token = session.data?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: trimmed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      setEditingName(false);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to save name");
    } finally {
      setNameSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* ── Account ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>

          <Text style={styles.label}>Status</Text>
          <Text style={styles.value}>
            {isGuest ? "Guest session (local only)" : user?.email ?? "Unknown"}
          </Text>

          {isAuthenticated && (
            <>
              {/* ── Profile Photo ── */}
              <Text style={[styles.label, { marginTop: 12 }]}>Profile Photo</Text>
              <View style={styles.avatarRow}>
                <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={styles.avatarWrap}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarThumb} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>
                        {(user?.email?.[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {avatarUploading && (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </Pressable>
                <View style={{ flex: 1, gap: 6 }}>
                  <Pressable onPress={handlePickAvatar} disabled={avatarUploading} style={[styles.smallBtn, { borderColor: ACCENT }]}>
                    <Text style={{ color: ACCENT, fontWeight: "700", fontSize: 12 }}>
                      {avatarUrl ? "Change Photo" : "Upload Photo"}
                    </Text>
                  </Pressable>
                  {avatarUrl && (
                    <Pressable onPress={handleRemoveAvatar} disabled={avatarUploading} style={[styles.smallBtn, { borderColor: BORDER }]}>
                      <Text style={{ color: MUTED, fontWeight: "700", fontSize: 12 }}>Remove</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              {avatarError && <Text style={{ color: DANGER, fontSize: 12, marginTop: 4 }}>{avatarError}</Text>}

              <Text style={[styles.label, { marginTop: 12 }]}>Display Name</Text>
              {editingName ? (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={styles.input}
                    value={nameInput}
                    onChangeText={setNameInput}
                    placeholder="Your name"
                    placeholderTextColor="#5f6b86"
                    autoFocus
                  />
                  {nameError ? (
                    <Text style={{ color: DANGER, fontSize: 12 }}>{nameError}</Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Pressable
                      onPress={handleSaveName}
                      disabled={nameSaving || !nameInput.trim()}
                      style={[styles.smallBtn, { borderColor: ACCENT, flex: 1 }, (nameSaving || !nameInput.trim()) && { opacity: 0.5 }]}
                    >
                      {nameSaving ? (
                        <ActivityIndicator size="small" color={ACCENT} />
                      ) : (
                        <Text style={{ color: ACCENT, fontWeight: "700", fontSize: 13 }}>Save</Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => { setEditingName(false); setNameError(null); }}
                      style={[styles.smallBtn, { borderColor: BORDER, flex: 1 }]}
                    >
                      <Text style={{ color: MUTED, fontWeight: "700", fontSize: 13 }}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => { setEditingName(true); setNameInput(""); }}
                  style={{ marginTop: 4 }}
                >
                  <Text style={{ color: ACCENT, fontSize: 13 }}>Edit Display Name →</Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* ── Subscription ────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Subscription</Text>
          <Text style={styles.label}>Current Plan</Text>
          <Text style={[styles.value, isPremium && { color: "#fbbf24" }]}>{tierLabel}</Text>

          {!isPremium && (
            <Pressable
              onPress={() => router.push("/(tabs)/membership")}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: ACCENT, fontSize: 13 }}>Upgrade to Premium →</Text>
            </Pressable>
          )}

          {isPremium && (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>
              All premium features active.
            </Text>
          )}
        </View>

        {/* ── Legal ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Legal</Text>
          <Pressable onPress={() => void Linking.openURL("https://lume.app/privacy")} style={styles.linkRow}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL("https://lume.app/terms")} style={[styles.linkRow, { marginTop: 10 }]}>
            <Text style={styles.linkText}>Terms of Service</Text>
          </Pressable>
        </View>

        {/* ── About ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>{APP_VERSION}</Text>
        </View>

        {/* ── Sign out ─────────────────────────────────────────────── */}
        <Pressable
          style={[styles.logoutButton, isAuthActionLoading && styles.disabled]}
          onPress={handleLogout}
          disabled={isAuthActionLoading}
        >
          <Text style={styles.logoutText}>
            {isAuthActionLoading
              ? isGuest ? "Exiting…" : "Logging out…"
              : isGuest ? "Exit Guest Mode" : "Log Out"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { padding: 20, gap: 16, paddingBottom: 48 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 4,
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 8 },
  label: { color: MUTED, fontSize: 13 },
  value: { color: "#fff", fontSize: 15, fontWeight: "600" },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: "#fff",
    backgroundColor: "#050814",
    fontSize: 14,
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6 },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, overflow: "hidden", position: "relative" },
  avatarThumb: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1a2035",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: BORDER,
  },
  avatarPlaceholderText: { color: ACCENT, fontSize: 24, fontWeight: "900" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center",
  },
  linkRow: { paddingVertical: 2 },
  linkText: { color: ACCENT, fontSize: 14 },
  logoutButton: {
    backgroundColor: "transparent",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DANGER,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { color: DANGER, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.6 },
});
