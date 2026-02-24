// src/features/history/useHistory.ts
import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<HistoryFilters>({
    range: "today",
    mode: "all",
  });

  const queryString = useMemo(() => {
    const { from, to } = buildRange(filters);
    const qs = new URLSearchParams();
    qs.set("from", from);
    qs.set("to", to);
    if (filters.mode !== "all") qs.set("mode", filters.mode);
    return qs.toString();
  }, [filters]);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch<HistoryResponse>(`/api/history?${queryString}`, {
        method: "GET",
        auth: true,
      });

      setItems(Array.isArray(res?.items) ? res.items : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load history");
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const setRange = useCallback((range: HistoryRangePreset) => {
    setFilters((p) => ({ ...p, range }));
  }, []);

  const setMode = useCallback((mode: HistoryModeFilter) => {
    setFilters((p) => ({ ...p, mode }));
  }, []);

  const refetch = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    items,
    isLoading,
    error,
    filters,
    setRange,
    setMode,
    refetch,
  };
}