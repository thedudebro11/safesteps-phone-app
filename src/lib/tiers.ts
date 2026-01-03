export function getEmergencyRecipientLimit(params: {
  isGuest: boolean;
  isPremium?: boolean;
}): number {
  if (params.isGuest) return 1;
  if (params.isPremium) return 10; // later: Infinity
  return 3;
}
