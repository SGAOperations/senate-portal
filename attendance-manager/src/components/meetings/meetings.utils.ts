export const isMeetingAdjustmentRequestEligible = (
  meetingDate: string | null | undefined,
  startTime?: string | null,
  now: Date = new Date(),
): boolean => {
  if (!meetingDate) {
    return false;
  }

  const normalizedStartTime = startTime || '00:00';
  const meetingDateTime = new Date(`${meetingDate}T${normalizedStartTime}:00`);

  if (Number.isNaN(meetingDateTime.getTime())) {
    return false;
  }

  return meetingDateTime > now;
};

// Mirrors the server rule in RequestService.createRequest: a request made
// 24 hours or less before the meeting starts is flagged late.
export const LATE_REQUEST_WINDOW_HOURS = 24;

export const isMeetingRequestLate = (
  meetingDate: string | null | undefined,
  startTime?: string | null,
  now: Date = new Date(),
): boolean => {
  if (!meetingDate) {
    return false;
  }

  const meetingDateTime = new Date(`${meetingDate}T${startTime || '00:00'}:00`);

  if (Number.isNaN(meetingDateTime.getTime())) {
    return false;
  }

  const hoursUntilMeeting =
    (meetingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntilMeeting <= LATE_REQUEST_WINDOW_HOURS;
};
