import { isMeetingAdjustmentRequestEligible } from '../meetings.utils';

describe('isMeetingAdjustmentRequestEligible', () => {
  it('includes same-day meetings that start later today', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(
      isMeetingAdjustmentRequestEligible('2026-10-06', '13:00', now),
    ).toBe(true);
  });

  it('excludes meetings that already started', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(
      isMeetingAdjustmentRequestEligible('2026-10-06', '11:00', now),
    ).toBe(false);
  });

  it('includes a future meeting with a month/day/year date', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(isMeetingAdjustmentRequestEligible('10/8/2026', '13:00', now)).toBe(
      true,
    );
  });

  it('includes a future meeting with a 12-hour time and seconds', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(
      isMeetingAdjustmentRequestEligible('2026-10-08', '8:12:56 PM', now),
    ).toBe(true);
  });

  it('includes a future meeting with ISO DateTime API values', () => {
    const now = new Date('2026-10-06T12:00:00.000Z');

    expect(
      isMeetingAdjustmentRequestEligible(
        '2026-10-08T04:00:00.000Z',
        '2026-10-08T20:00:00.000Z',
        now,
      ),
    ).toBe(true);
  });

  it('excludes meetings with an invalid date or time', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(isMeetingAdjustmentRequestEligible('not-a-date', '13:00', now)).toBe(
      false,
    );
    expect(
      isMeetingAdjustmentRequestEligible('2026-10-08', 'not-a-time', now),
    ).toBe(false);
  });
});
