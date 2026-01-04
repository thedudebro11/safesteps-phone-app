import type { ShareSession } from "./types";

export function shouldStopEmergencyAfterEndingShare(params: {
  mode: "idle" | "active" | "emergency";
  endingShare: ShareSession;
  activeShares: ShareSession[];
}) {
  const { mode, endingShare, activeShares } = params;
  if (mode !== "emergency") return false;
  if (endingShare.reason !== "emergency") return false;

  const activeEmergency = activeShares.filter(
    (s) => s.status === "live" && s.reason === "emergency"
  );

  return activeEmergency.length === 1 && activeEmergency[0].id === endingShare.id;
}
