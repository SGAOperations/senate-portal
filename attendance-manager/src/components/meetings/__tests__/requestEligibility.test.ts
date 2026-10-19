import {
  isMeetingAdjustmentRequestEligible,
  isMeetingRequestLate,
} from '../meetings.utils';

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
