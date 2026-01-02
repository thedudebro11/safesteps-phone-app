// src/features/shares/types.ts

export type ShareStatus = "live" | "ended";

export type ShareContactSnapshot = {
  name: string;
  phone?: string;
  email?: string;
};

export type ShareSession = {
  id: string;
  contactId: string;
  contactSnapshot: ShareContactSnapshot;
  status: ShareStatus;
  startedAt: string;
  endedAt?: string;
};
