import { isMeetingAdjustmentRequestEligible } from '../meetings.utils';

describe('isMeetingAdjustmentRequestEligible', () => {
  const now = new Date('2026-10-06T16:00:00.000Z'); // 12:00 PM EDT

  it('includes same-day meetings that start later today', () => {
    expect(
      isMeetingAdjustmentRequestEligible('2026-10-06T17:00:00.000Z', now),
    ).toBe(true);
  });

  it('includes meetings on a later day', () => {
    expect(
      isMeetingAdjustmentRequestEligible('2026-10-08T20:00:00.000Z', now),
    ).toBe(true);
  });

  it('excludes meetings that already started', () => {
    expect(
      isMeetingAdjustmentRequestEligible('2026-10-06T15:00:00.000Z', now),
    ).toBe(false);
  });

  it('excludes a meeting that starts exactly now', () => {
    expect(isMeetingAdjustmentRequestEligible(now.toISOString(), now)).toBe(
      false,
    );
  });

  it('excludes missing or invalid start times', () => {
    expect(isMeetingAdjustmentRequestEligible(null, now)).toBe(false);
    expect(isMeetingAdjustmentRequestEligible(undefined, now)).toBe(false);
    expect(isMeetingAdjustmentRequestEligible('', now)).toBe(false);
    expect(isMeetingAdjustmentRequestEligible('not-a-date', now)).toBe(false);
  });
});
