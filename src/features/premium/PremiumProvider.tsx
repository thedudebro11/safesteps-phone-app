// src/features/premium/PremiumProvider.tsx
//
// Premium subscription stub. isPremium is hardcoded false until RevenueCat
// (or Expo IAP) is integrated. Wire-up point: replace the stub below with
// Purchases.getCustomerInfo() from react-native-purchases.
//
import React, { createContext, useContext, useMemo } from "react";

type PremiumContextValue = {
  isPremium: boolean;
  isLoadingSubscription: boolean;
  restorePurchases: () => Promise<void>;
  purchasePremium: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | undefined>(undefined);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium: false, // TODO: wire to RevenueCat entitlement check
      isLoadingSubscription: false,
      restorePurchases: async () => {
        // TODO: Purchases.restorePurchases()
      },
      purchasePremium: async () => {
        // TODO: Purchases.purchaseStoreProduct(product)
      },
    }),
    []
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error("usePremium must be used within <PremiumProvider />");
  return ctx;
}
