function parseMeetingDateTime(
  meetingDate: string,
  startTime: string | null | undefined,
): Date | null {
  if (
    /^\d{4}-\d{2}-\d{2}T/.test(meetingDate) &&
    startTime &&
    /^\d{4}-\d{2}-\d{2}T/.test(startTime)
  ) {
    const dateValue = new Date(meetingDate);
    const startTimeValue = new Date(startTime);
    if (
      Number.isNaN(dateValue.getTime()) ||
      Number.isNaN(startTimeValue.getTime())
    ) {
      return null;
    }
    return startTimeValue;
  }

  const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(meetingDate.trim());
  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(meetingDate.trim());

  let year: number;
  let month: number;
  let day: number;

  if (isoDate) {
    year = Number(isoDate[1]);
    month = Number(isoDate[2]);
    day = Number(isoDate[3]);
  } else if (usDate) {
    month = Number(usDate[1]);
    day = Number(usDate[2]);
    year = Number(usDate[3]);
  } else {
    return null;
  }

  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const time = (startTime || '00:00').trim();
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(time);
  if (!timeMatch) return null;

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] || 0);
  const period = timeMatch[4]?.toUpperCase();

  if (minutes > 59 || seconds > 59) return null;

  if (period) {
    if (hours < 1 || hours > 12) return null;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
  } else if (hours > 23) {
    return null;
  }

  const meetingDateTime = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
  );
  if (
    meetingDateTime.getFullYear() !== year ||
    meetingDateTime.getMonth() !== month - 1 ||
    meetingDateTime.getDate() !== day ||
    meetingDateTime.getHours() !== hours ||
    meetingDateTime.getMinutes() !== minutes ||
    meetingDateTime.getSeconds() !== seconds
  ) {
    return null;
  }

  return meetingDateTime;
}

export const isMeetingAdjustmentRequestEligible = (
  meetingDate: string | null | undefined,
  startTime?: string | null,
  now: Date = new Date(),
): boolean => {
  if (!meetingDate) return false;

  const meetingDateTime = parseMeetingDateTime(meetingDate, startTime);
  return meetingDateTime !== null && meetingDateTime > now;
};
