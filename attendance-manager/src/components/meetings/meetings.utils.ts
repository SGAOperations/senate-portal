export const isMeetingAdjustmentRequestEligible = (
  startTime: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!startTime) return false;

  const startsAt = new Date(startTime);
  return !Number.isNaN(startsAt.getTime()) && startsAt > now;
};

// Mirrors the server rule in RequestService.createRequest: a request made
// 24 hours or less before the meeting starts is flagged late.
export const LATE_REQUEST_WINDOW_HOURS = 24;

export const isMeetingRequestLate = (
  startTime: string | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!startTime) return false;

  const startsAt = new Date(startTime);
  if (Number.isNaN(startsAt.getTime())) return false;

  const hoursUntilMeeting =
    (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilMeeting <= LATE_REQUEST_WINDOW_HOURS;
};
