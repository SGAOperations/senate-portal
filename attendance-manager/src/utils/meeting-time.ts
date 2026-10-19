// Shared by the browser and the server so the late-request rule is defined once.
export const LATE_REQUEST_WINDOW_HOURS = 24;

// Meeting times arrive as ISO strings from the API and as Dates from Prisma.
export const parseMeetingStart = (
  startTime: Date | string | null | undefined,
): Date | null => {
  if (!startTime) return null;

  const startsAt = new Date(startTime);
  return Number.isNaN(startsAt.getTime()) ? null : startsAt;
};

// A request made 24 hours or less before the meeting starts is flagged late.
export const isMeetingRequestLate = (
  startTime: Date | string | null | undefined,
  now: Date = new Date(),
): boolean => {
  const startsAt = parseMeetingStart(startTime);
  if (!startsAt) return false;

  const hoursUntilMeeting =
    (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilMeeting <= LATE_REQUEST_WINDOW_HOURS;
};
