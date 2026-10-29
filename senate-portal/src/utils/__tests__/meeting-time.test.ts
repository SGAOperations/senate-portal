import {
  isMeetingRequestLate,
  LATE_REQUEST_WINDOW_HOURS,
  parseMeetingStart,
} from '../meeting-time';

describe('parseMeetingStart', () => {
  it('parses ISO strings and Date objects', () => {
    expect(parseMeetingStart('2026-10-06T17:00:00.000Z')?.toISOString()).toBe(
      '2026-10-06T17:00:00.000Z',
    );
    const date = new Date('2026-10-06T17:00:00.000Z');
    expect(parseMeetingStart(date)?.getTime()).toBe(date.getTime());
  });

  it('returns null for missing or invalid values', () => {
    expect(parseMeetingStart(null)).toBeNull();
    expect(parseMeetingStart(undefined)).toBeNull();
    expect(parseMeetingStart('')).toBeNull();
    expect(parseMeetingStart('not-a-date')).toBeNull();
  });
});

test('late window is 24 hours', () => {
  expect(LATE_REQUEST_WINDOW_HOURS).toBe(24);
});

describe('isMeetingRequestLate', () => {
  const now = new Date('2026-10-06T16:00:00.000Z'); // 12:00 PM EDT

  it('flags same-day meetings as late', () => {
    expect(isMeetingRequestLate('2026-10-06T17:00:00.000Z', now)).toBe(true);
  });

  it('flags a meeting starting exactly 24 hours out as late', () => {
    expect(isMeetingRequestLate('2026-10-07T16:00:00.000Z', now)).toBe(true);
  });

  it('does not flag a meeting just over 24 hours out', () => {
    expect(isMeetingRequestLate('2026-10-07T16:01:00.000Z', now)).toBe(false);
  });

  it('does not flag a meeting about 26 hours out', () => {
    expect(isMeetingRequestLate('2026-10-07T18:00:00.000Z', now)).toBe(false);
  });

  it('does not flag meetings several days away', () => {
    expect(isMeetingRequestLate('2026-10-10T13:00:00.000Z', now)).toBe(false);
  });

  it('returns false for missing or invalid start times', () => {
    expect(isMeetingRequestLate(null, now)).toBe(false);
    expect(isMeetingRequestLate(undefined, now)).toBe(false);
    expect(isMeetingRequestLate('', now)).toBe(false);
    expect(isMeetingRequestLate('not-a-date', now)).toBe(false);
  });
});

describe('isMeetingRequestLate with Date input', () => {
  const now = new Date('2026-10-06T16:00:00.000Z');

  it('works with the Date objects the server reads from Prisma', () => {
    expect(
      isMeetingRequestLate(new Date('2026-10-07T16:00:00.000Z'), now),
    ).toBe(true);
    expect(
      isMeetingRequestLate(new Date('2026-10-07T18:00:00.000Z'), now),
    ).toBe(false);
  });
});
