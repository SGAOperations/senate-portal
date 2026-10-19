export const isMeetingAdjustmentRequestEligible = (
  startTime: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!startTime) return false;

  const startsAt = new Date(startTime);
  return !Number.isNaN(startsAt.getTime()) && startsAt > now;
};
