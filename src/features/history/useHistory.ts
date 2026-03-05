// src/features/history/useHistory.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/src/lib/apiClient";
import type {
  HistoryFilters,
  HistoryItem,
  HistoryModeFilter,
  HistoryRangePreset,
} from "@/src/features/history/types";

function startOfTodayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function daysAgoIso(days: number) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function buildRange(filters: HistoryFilters) {
  const to = new Date().toISOString();
  let from: string;
  if (filters.range === "today") from = startOfTodayIso();
  else if (filters.range === "7d") from = daysAgoIso(7);
  else from = daysAgoIso(30);
  return { from, to };
}

type HistoryResponse = { items: HistoryItem[] };

function mergeById(prev: HistoryItem[], next: HistoryItem[]) {
  // keep newest-first ordering (server already returns newest-first)
  const map = new Map<string, HistoryItem>();
  for (const it of prev) map.set(String((it as any).id), it);
  for (const it of next) map.set(String((it as any).id), it);

  // sort by createdAt desc if present
  const merged = Array.from(map.values());
  merged.sort((a: any, b: any) => {
    const ta = Date.parse(a.createdAt ?? a.created_at ?? "") || 0;
    const tb = Date.parse(b.createdAt ?? b.created_at ?? "") || 0;
    return tb - ta;
  });

  return merged;
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);      // for initial/manual loads
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<HistoryFilters>({
    range: "today",
    mode: "all",
  });

  const inFlightRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchHistory = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const silent = opts?.silent === true;

      // Only show loading UI on first load OR explicit/manual refresh
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const { from, to } = buildRange(filters);
        const qs = new URLSearchParams();
        qs.set("from", from);
        qs.set("to", to);
        if (filters.mode !== "all") qs.set("mode", filters.mode);

        const res = await apiFetch<HistoryResponse>(`/api/history?${qs.toString()}`, {
          method: "GET",
          auth: true,
        });

        const next = Array.isArray(res?.items) ? res.items : [];

        setItems((prev) => {
          // first load or non-silent refresh can replace; silent merges
          if (!hasLoadedOnceRef.current || !silent) return next;
          return mergeById(prev, next);
        });

        hasLoadedOnceRef.current = true;
      } catch (e: any) {
        setError(e?.message ?? "Failed to load history");
        if (!silent) setItems([]);
      } finally {
        if (!silent) setIsLoading(false);
        inFlightRef.current = false;
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchHistory({ silent: false });
  }, [fetchHistory]);

  return {
    items,
    isLoading,
    error,
    filters,
    setRange: (range: HistoryRangePreset) => setFilters((p) => ({ ...p, range })),
    setMode: (mode: HistoryModeFilter) => setFilters((p) => ({ ...p, mode })),
    refetch: fetchHistory, // call refetch({silent:true}) for background updates
  };
}