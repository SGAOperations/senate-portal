import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export const MEETING_TIME_ZONE = 'America/New_York';

export class MeetingDateTimeInputError extends Error {}

function parseDateInput(value: string): string {
  const trimmedValue = value.trim();
  let year: number;
  let month: number;
  let day: number;

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmedValue);
  const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);

  if (isoMatch) {
    [, year, month, day] = isoMatch.map(Number) as [
      number,
      number,
      number,
      number,
    ];
  } else if (usMatch) {
    [, month, day, year] = usMatch.map(Number) as [
      number,
      number,
      number,
      number,
    ];
  } else {
    throw new MeetingDateTimeInputError(`Unsupported meeting date: ${value}`);
  }

  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new MeetingDateTimeInputError(`Invalid meeting date: ${value}`);
  }

  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseTimeInput(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(
    value.trim(),
  );
  if (!match) {
    throw new MeetingDateTimeInputError(`Unsupported meeting time: ${value}`);
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? '0');
  const period = match[4]?.toUpperCase();

  if (minutes > 59 || seconds > 59) {
    throw new MeetingDateTimeInputError(`Invalid meeting time: ${value}`);
  }

  if (period) {
    if (hours < 1 || hours > 12) {
      throw new MeetingDateTimeInputError(`Invalid meeting time: ${value}`);
    }
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
  } else if (hours > 23) {
    throw new MeetingDateTimeInputError(`Invalid meeting time: ${value}`);
  }

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function parseMeetingDate(value: string): Date {
  const date = parseDateInput(value);
  return fromZonedTime(`${date}T00:00:00`, MEETING_TIME_ZONE);
}

export function parseMeetingDateTime(
  dateValue: string,
  timeValue: string,
): Date {
  const date = parseDateInput(dateValue);
  const time = parseTimeInput(timeValue);
  const parsedDateTime = fromZonedTime(`${date}T${time}`, MEETING_TIME_ZONE);

  if (
    formatInTimeZone(
      parsedDateTime,
      MEETING_TIME_ZONE,
      'yyyy-MM-dd HH:mm:ss',
    ) !== `${date} ${time}`
  ) {
    throw new MeetingDateTimeInputError(
      `Invalid or nonexistent Eastern meeting time: ${date} ${time}`,
    );
  }

  return parsedDateTime;
}

function asDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid meeting datetime: ${value}`);
  }
  return date;
}

export function formatMeetingDateInput(value: Date | string): string {
  return formatInTimeZone(asDate(value), MEETING_TIME_ZONE, 'yyyy-MM-dd');
}

export function formatMeetingTimeInput(value: Date | string): string {
  return formatInTimeZone(asDate(value), MEETING_TIME_ZONE, 'HH:mm');
}

export function formatMeetingDate(value: Date | string): string {
  return formatInTimeZone(asDate(value), MEETING_TIME_ZONE, 'M/d/yyyy');
}

export function formatMeetingDateLabel(value: Date | string): string {
  return formatInTimeZone(asDate(value), MEETING_TIME_ZONE, 'EEE, MMM d');
}

export function formatMeetingTime(value: Date | string): string {
  return formatInTimeZone(asDate(value), MEETING_TIME_ZONE, 'h:mm a');
}

export function formatCalendarDateKey(value: Date): string {
  return `${value.getFullYear()}-${(value.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getDate().toString().padStart(2, '0')}`;
}

export function getMeetingDateRange(value: Date | string) {
  const dateKey = formatMeetingDateInput(value);
  const [year, month, day] = dateKey.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateKey = nextDay.toISOString().slice(0, 10);

  return {
    start: parseMeetingDate(dateKey),
    end: parseMeetingDate(nextDateKey),
  };
}
