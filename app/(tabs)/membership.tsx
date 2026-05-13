// app/(tabs)/membership.tsx
import React from "react";
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/src/features/auth/AuthProvider";
import { usePremium } from "@/src/features/premium/PremiumProvider";
import { PREMIUM_DISPLAY_PRICE } from "@/src/features/premium/pricing";

const BG = "#050814";
const CARD_BG = "#0c1020";
const BORDER = "#1a2035";
const ACCENT = "#3896ff";
const MUTED = "#a6b1cc";

type Tier = "guest" | "free" | "premium";

function currentTier(isGuest: boolean, isPremium: boolean): Tier {
  if (isPremium) return "premium";
  if (isGuest) return "guest";
  return "free";
}

const FEATURES: Array<{ label: string; guest: string; free: string; premium: string }> = [
  { label: "Trusted Contacts",     guest: "1",         free: "3",       premium: "10" },
  { label: "Emergency Recipients", guest: "—",         free: "3",       premium: "10" },
  { label: "Emergency Mode",       guest: "—",         free: "✓",       premium: "✓" },
  { label: "History",              guest: "Local only", free: "24 hours", premium: "30 days" },
  { label: "Tracking Interval",    guest: "60s",       free: "30s",     premium: "15s" },
  { label: "Share Sessions",       guest: "1",         free: "3",       premium: "Unlimited" },
];

export default function MembershipScreen() {
  const { isGuest, isAuthenticated } = useAuth();
  const { isPremium, purchasePremium, restorePurchases, isLoadingSubscription } = usePremium();
  const tier = currentTier(isGuest, isPremium);

  const tierLabel = tier === "premium" ? "Premium" : tier === "guest" ? "Guest" : "Free";

  const tierBadgeStyle =
    tier === "premium"
      ? styles.badgePremium
      : tier === "guest"
      ? styles.badgeGuest
      : styles.badgeFree;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Lume Premium</Text>
          <Text style={styles.subtitle}>Protect the people you love</Text>
        </View>

        {/* ── Current plan badge ───────────────────────────────────── */}
        <View style={styles.currentPlanRow}>
          <Text style={styles.currentPlanLabel}>Current plan</Text>
          <View style={[styles.badge, tierBadgeStyle]}>
            <Text style={styles.badgeText}>{tierLabel}</Text>
          </View>
        </View>

        {/* ── Tier comparison table ────────────────────────────────── */}
        <View style={styles.table}>
          {/* Column headers */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.featureCell, styles.tableHeaderText]}>Feature</Text>
            <Text style={[styles.tierCell, tier === "guest" && styles.highlightCell, styles.tableHeaderText]}>Guest</Text>
            <Text style={[styles.tierCell, tier === "free" && styles.highlightCell, styles.tableHeaderText]}>Free</Text>
            <Text style={[styles.tierCell, tier === "premium" && styles.highlightPremiumCell, styles.tableHeaderText]}>Premium</Text>
          </View>

          {FEATURES.map((f, i) => (
            <View
              key={f.label}
              style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
            >
              <Text style={styles.featureCell}>{f.label}</Text>
              <Text style={[styles.tierCell, tier === "guest" && styles.highlightCell]}>{f.guest}</Text>
              <Text style={[styles.tierCell, tier === "free" && styles.highlightCell]}>{f.free}</Text>
              <Text style={[styles.tierCell, tier === "premium" && styles.highlightPremiumCell, styles.premiumValue]}>
                {f.premium}
              </Text>
            </View>
          ))}
        </View>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        {!isPremium && (
          <View style={styles.ctaSection}>
            <Pressable
              style={[styles.ctaButton, isLoadingSubscription && { opacity: 0.6 }]}
              onPress={() => void purchasePremium()}
              disabled={isLoadingSubscription}
            >
              <Text style={styles.ctaButtonText}>
                {isLoadingSubscription
                  ? "Loading…"
                  : `Get Premium — ${PREMIUM_DISPLAY_PRICE}`}
              </Text>
            </Pressable>

            <Text style={styles.ctaFine}>Cancel anytime. Billed monthly.</Text>

            {isAuthenticated && (
              <Pressable
                onPress={() => void restorePurchases()}
                style={styles.restoreBtn}
                disabled={isLoadingSubscription}
              >
                <Text style={styles.restoreText}>Restore Purchases</Text>
              </Pressable>
            )}
          </View>
        )}

        {isPremium && (
          <View style={styles.premiumActiveCard}>
            <Text style={styles.premiumActiveTitle}>Premium Active</Text>
            <Text style={styles.premiumActiveBody}>
              You have access to all premium features.
            </Text>
            <Pressable
              onPress={() => void Linking.openURL("https://apps.apple.com/account/subscriptions")}
            >
              <Text style={styles.manageLink}>Manage subscription →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  container: { padding: 20, paddingBottom: 48, gap: 24 },

  header: { gap: 6 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: MUTED, fontSize: 15 },

  currentPlanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentPlanLabel: { color: MUTED, fontSize: 14 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeGuest: { borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.04)" },
  badgeFree: { borderColor: "rgba(56,150,255,0.4)", backgroundColor: "rgba(56,150,255,0.10)" },
  badgePremium: { borderColor: "rgba(251,191,36,0.5)", backgroundColor: "rgba(251,191,36,0.12)" },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // ── Table
  table: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tableHeaderText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableRowEven: { backgroundColor: "transparent" },
  tableRowOdd: { backgroundColor: "rgba(255,255,255,0.015)" },
  featureCell: { flex: 2, color: MUTED, fontSize: 12 },
  tierCell: { flex: 1, color: MUTED, fontSize: 12, textAlign: "center" },
  highlightCell: { color: ACCENT, fontWeight: "700" },
  highlightPremiumCell: { color: "#fbbf24", fontWeight: "700" },
  premiumValue: { fontWeight: "700" },

  // ── CTA
  ctaSection: { gap: 12, alignItems: "center" },
  ctaButton: {
    width: "100%",
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ctaFine: { color: MUTED, fontSize: 12 },
  restoreBtn: { paddingVertical: 8 },
  restoreText: { color: MUTED, fontSize: 13, textDecorationLine: "underline" },

  // ── Premium active
  premiumActiveCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
    padding: 16,
    gap: 6,
  },
  premiumActiveTitle: { color: "#fbbf24", fontWeight: "800", fontSize: 16 },
  premiumActiveBody: { color: MUTED, fontSize: 13 },
  manageLink: { color: ACCENT, fontSize: 13, marginTop: 4 },
});
