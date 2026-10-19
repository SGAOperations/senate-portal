import {
  formatMeetingDateInput,
  formatMeetingTimeInput,
  parseMeetingDate,
  parseMeetingDateTime,
} from '../meetingDateTime';

describe('meeting date-time conversion', () => {
  it('parses ISO dates and 24-hour form times as Eastern instants', () => {
    const meetingStart = parseMeetingDateTime('2026-04-04', '19:55');

    expect(meetingStart.toISOString()).toBe('2026-04-04T23:55:00.000Z');
    expect(formatMeetingDateInput(meetingStart)).toBe('2026-04-04');
    expect(formatMeetingTimeInput(meetingStart)).toBe('19:55');
  });

  it('parses legacy month/day and 12-hour values', () => {
    const meetingStart = parseMeetingDateTime('7/30/2025', '8:12:56 PM');

    expect(meetingStart.toISOString()).toBe('2025-07-31T00:12:56.000Z');
  });

  it('parses a date-only value at Eastern midnight', () => {
    expect(parseMeetingDate('2025-12-01').toISOString()).toBe(
      '2025-12-01T05:00:00.000Z',
    );
  });

  it('rejects invalid dates and nonexistent daylight-saving times', () => {
    expect(() => parseMeetingDateTime('2025-02-30', '10:00')).toThrow(
      'Invalid meeting date',
    );
    expect(() => parseMeetingDateTime('2026-03-08', '02:30')).toThrow(
      'Invalid or nonexistent Eastern meeting time',
    );
  });
});
