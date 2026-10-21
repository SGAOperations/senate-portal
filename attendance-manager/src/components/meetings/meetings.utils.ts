import { parseMeetingStart } from '@/utils/meeting-time';

export const isMeetingAdjustmentRequestEligible = (
  startTime: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  const startsAt = parseMeetingStart(startTime);
  return startsAt !== null && startsAt > now;
};
