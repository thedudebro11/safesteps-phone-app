// src/features/shares/SharesProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { readJson, writeJson } from "@/src/lib/storage";
import { createId } from "@/src/lib/ids";
import type { ShareSession } from "./types";
import type { Contact } from "@/src/features/contacts/types";
import { useAuth } from "@/src/features/auth/AuthProvider";


type SharesContextValue = {
  shares: ShareSession[];
  isLoaded: boolean;

  // ✅ Option B gates
  activeShareToken: string | null;
  hasActiveShare: boolean;

  createShareForContact(
    contact: Contact,
    reason?: "manual" | "emergency"
  ): Promise<ShareSession>;

  endShare(shareId: string): Promise<void>;
  getActiveShareByContactId(contactId: string): ShareSession | undefined;
  getActiveShares(): ShareSession[];
};

const SharesContext = createContext<SharesContextValue | null>(null);

const STORAGE_KEY = "safesteps.shares.v1";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";

async function registerShareToken(token: string, reason: "manual" | "emergency") {
  if (!API_BASE_URL) return; // allow offline/dev without server
  await fetch(`${API_BASE_URL}/api/shares/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, reason }),
  }).catch(() => { });
}

async function endShareToken(token: string) {
  if (!API_BASE_URL) return;
  await fetch(`${API_BASE_URL}/api/shares/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => { });
}


export function SharesProvider({ children }: { children: React.ReactNode }) {
  const [shares, setShares] = useState<ShareSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isGuest } = useAuth();

  useEffect(() => {
    (async () => {
      const saved = await readJson<ShareSession[]>(STORAGE_KEY, []);
      setShares(Array.isArray(saved) ? saved : []);
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    writeJson(STORAGE_KEY, shares).catch(() => { });
  }, [shares, isLoaded]);

  const value = useMemo<SharesContextValue>(() => {
    const activeShare = shares.find((s) => s.status === "live") ?? null;
    const activeShareToken = activeShare?.token ?? null;

    return {
      shares,
      isLoaded,

      activeShareToken,
      hasActiveShare: !!activeShareToken,

      async createShareForContact(
        contact: Contact,
        reason: "manual" | "emergency" = "manual"
      ) {
        const existing = shares.find((s) => s.contactId === contact.id && s.status === "live");
        const existingLive = shares.find((s) => s.status === "live");

        // ✅ Guest can only have one LIVE share total
        if (isGuest && existingLive) {
          // Same contact: reuse and optionally upgrade reason
          if (existingLive.contactId === contact.id) {
            if (reason === "emergency" && existingLive.reason !== "emergency") {
              // 1) update local state
              setShares((prev) =>
                prev.map((s) => (s.id === existingLive.id ? { ...s, reason: "emergency" } : s))
              );
              // 2) update server registry too
              await registerShareToken(existingLive.token, "emergency");
              return { ...existingLive, reason: "emergency" };
            }

            // Ensure server knows this token exists (in case share was created before server ran)
            await registerShareToken(existingLive.token, existingLive.reason);
            return existingLive;
          }

          throw new Error("Guest can only have 1 active share. End current share first.");
        }

        // Non-guest: reuse per-contact share if already live
        if (existing) {
          await registerShareToken(existing.token, existing.reason);
          return existing;
        }

        const next: ShareSession = {
          id: createId("sh"),
          token: createId("st"),
          contactId: contact.id,
          contactSnapshot: {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
          },
          status: "live",
          reason,
          startedAt: new Date().toISOString(),
        };

        // Register with server first (fine either way; this makes debugging clearer)
        await registerShareToken(next.token, reason);

        setShares((prev) => [next, ...prev]);
        return next;
      },



      async endShare(shareId: string) {
        let endingToken: string | null = null;

        setShares((prev) => {
          const ending = prev.find((s) => s.id === shareId);
          endingToken = ending?.token ?? null;

          return prev.map((s) =>
            s.id === shareId && s.status === "live"
              ? { ...s, status: "ended", endedAt: new Date().toISOString() }
              : s
          );
        });

        if (endingToken) await endShareToken(endingToken);
      }
      ,


      getActiveShareByContactId(contactId: string) {
        return shares.find((s) => s.contactId === contactId && s.status === "live");
      },

      getActiveShares() {
        return shares.filter((s) => s.status === "live");
      },
    };
  }, [shares, isLoaded]);

  return <SharesContext.Provider value={value}>{children}</SharesContext.Provider>;
}

export function useShares() {
  const ctx = useContext(SharesContext);
  if (!ctx) throw new Error("useShares must be used within a SharesProvider");
  return ctx;
}
