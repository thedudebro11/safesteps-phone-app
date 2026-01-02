// src/features/shares/SharesProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readJson, writeJson } from "@/src/lib/storage";
import { createId } from "@/src/lib/ids";
import type { ShareSession } from "./types";
import type { Contact } from "@/src/features/contacts/types";

type SharesContextValue = {
  shares: ShareSession[];
  isLoaded: boolean;
  createShareForContact(contact: Contact): Promise<ShareSession>;
  endShare(shareId: string): Promise<void>;
  getActiveShareByContactId(contactId: string): ShareSession | undefined;
  getActiveShares(): ShareSession[];
};

const SharesContext = createContext<SharesContextValue | null>(null);

const STORAGE_KEY = "safesteps.shares.v1";

export function SharesProvider({ children }: { children: React.ReactNode }) {
  const [shares, setShares] = useState<ShareSession[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await readJson<ShareSession[]>(STORAGE_KEY, []);
      setShares(Array.isArray(saved) ? saved : []);
      setIsLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    writeJson(STORAGE_KEY, shares).catch(() => {});
  }, [shares, isLoaded]);

  const value = useMemo<SharesContextValue>(() => {
    return {
      shares,
      isLoaded,
      async createShareForContact(contact) {
        // V1 rule: one active share per contact
        const existing = shares.find(
          (s) => s.contactId === contact.id && s.status === "live"
        );
        if (existing) return existing;

        const next: ShareSession = {
          id: createId("sh"),
          contactId: contact.id,
          contactSnapshot: {
            name: contact.name,
            phone: contact.phone,
            email: contact.email,
          },
          status: "live",
          startedAt: new Date().toISOString(),
        };

        setShares((prev) => [next, ...prev]);
        return next;
      },
      async endShare(shareId) {
        setShares((prev) =>
          prev.map((s) =>
            s.id === shareId && s.status === "live"
              ? { ...s, status: "ended", endedAt: new Date().toISOString() }
              : s
          )
        );
      },
      getActiveShareByContactId(contactId) {
        return shares.find(
          (s) => s.contactId === contactId && s.status === "live"
        );
      },
      getActiveShares() {
        return shares.filter((s) => s.status === "live");
      },
    };
  }, [shares, isLoaded]);

  return (
    <SharesContext.Provider value={value}>{children}</SharesContext.Provider>
  );
}

export function useShares() {
  const ctx = useContext(SharesContext);
  if (!ctx) throw new Error("useShares must be used within a SharesProvider");
  return ctx;
}
