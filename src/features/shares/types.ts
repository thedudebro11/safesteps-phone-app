export type ShareStatus = "live" | "ended";
export type ShareReason = "manual" | "emergency";

export type ShareContactSnapshot = {
  name: string;
  phone?: string;
  email?: string;
};

export type ShareSession = {
  id: string;
  token: string; // ✅ add this
  contactId: string;
  contactSnapshot: {
    name: string;
    phone?: string;
    email?: string;
  };
  status: "live" | "ended";
  reason: "manual" | "emergency";
  startedAt: string;
  endedAt?: string;
};

