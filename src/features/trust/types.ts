// src/features/trust/types.ts
export type TrustedContact = {
  userId: string;
  email: string;
  displayName: string | null;
  shareEnabled: boolean;
};

export type IncomingTrustRequest = {
  id: string;
  requester_user_id: string;
  requested_user_id: string;
  status: "pending" | "accepted" | "denied";
  created_at: string;
  updated_at: string;
};

export type UserLookupResult =
  | { exists: false }
  | { exists: true; isSelf?: boolean; userId: string; email: string; displayName?: string | null };