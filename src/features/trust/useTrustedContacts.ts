// src/features/trust/useTrustedContacts.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/src/lib/apiClient";
import type { IncomingTrustRequest, TrustedContact, UserLookupResult } from "./types";

type TrustListResponse = { contacts: TrustedContact[] };
type IncomingResponse = { requests: IncomingTrustRequest[] };

export function useTrustedContacts() {
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [incoming, setIncoming] = useState<IncomingTrustRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const [list, inc] = await Promise.all([
        apiFetch<TrustListResponse>("/api/trust/list", { method: "GET" }),
        apiFetch<IncomingResponse>("/api/trust/requests/incoming", { method: "GET" }),
      ]);

      if (!mountedRef.current) return;
      setContacts(list.contacts ?? []);
      setIncoming(inc.requests ?? []);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setErrorMsg(e?.message ?? "Failed to load trusted contacts");
    } finally {
      if (!mountedRef.current) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  const setShareEnabled = useCallback(
    async (viewerUserId: string, canView: boolean) => {
      // optimistic update
      setContacts((prev) =>
        prev.map((c) => (c.userId === viewerUserId ? { ...c, shareEnabled: canView } : c))
      );

      try {
        await apiFetch("/api/visibility/set", {
          method: "POST",
          json: { viewerUserId, canView },
        });
      } catch (e) {
        // rollback by refetch (safest)
        await refetch();
        throw e;
      }
    },
    [refetch]
  );

  const lookupUserByEmail = useCallback(async (email: string) => {
    const cleaned = email.trim().toLowerCase();
    if (!cleaned) throw new Error("Email is required");

    const res = await apiFetch<UserLookupResult>("/api/users/lookup", {
      method: "POST",
      json: { email: cleaned },
    });

    return res;
  }, []);

  const sendTrustRequest = useCallback(
    async (targetUserId: string) => {
      const id = String(targetUserId || "").trim();
      if (!id) throw new Error("Missing target user id");

      await apiFetch("/api/trust/request", {
        method: "POST",
        json: { targetUserId: id },
      });

      await refetch();
    },
    [refetch]
  );

  const acceptRequest = useCallback(
    async (requestId: string) => {
      await apiFetch(`/api/trust/requests/${requestId}/accept`, { method: "POST" });
      await refetch();
    },
    [refetch]
  );

  const denyRequest = useCallback(
    async (requestId: string) => {
      await apiFetch(`/api/trust/requests/${requestId}/deny`, { method: "POST" });
      await refetch();
    },
    [refetch]
  );

  const hasIncoming = useMemo(() => (incoming?.length ?? 0) > 0, [incoming]);

  return {
    contacts,
    incoming,
    hasIncoming,
    isLoading,
    errorMsg,
    refetch,

    setShareEnabled,
    lookupUserByEmail,
    sendTrustRequest,
    acceptRequest,
    denyRequest,
  };
}