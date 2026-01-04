export function getEmergencyRecipientLimit(params: {
  isGuest: boolean;
  isPremium?: boolean;
}): number {
  if (params.isGuest) return 1;
  if (params.isPremium) return 10; // later: Infinity
  return 3;
}
export function getTrustedContactLimit(params: {
  isGuest: boolean;
  isPremium: boolean;
}) {
  const { isGuest, isPremium } = params;

  if (isGuest) return 1;
  if (isPremium) return 10; // placeholder for later
  return 3; // signed-in free
}
