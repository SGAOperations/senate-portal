export const isMeetingRequestEligible = (
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
