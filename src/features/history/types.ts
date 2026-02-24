// src/features/history/types.ts
export type HistoryMode = "active" | "emergency";

export type HistoryItem = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  mode: HistoryMode;
  created_at: string; // ISO
};

export type HistoryRangePreset = "today" | "7d" | "30d";
export type HistoryModeFilter = "all" | HistoryMode;

export type HistoryFilters = {
  range: HistoryRangePreset;
  mode: HistoryModeFilter;
};