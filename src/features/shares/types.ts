export type ShareStatus = "live" | "ended";
export type ShareReason = "manual" | "emergency";

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
  reason: ShareReason;
  startedAt: string;
  endedAt?: string;
};
