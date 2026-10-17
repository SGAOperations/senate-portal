import {
  isMeetingAdjustmentRequestEligible,
  isMeetingRequestLate,
} from '../meetings.utils';

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
});

describe('isMeetingRequestLate', () => {
  const now = new Date('2026-10-06T12:00:00');

  it('flags same-day meetings as late', () => {
    expect(isMeetingRequestLate('2026-10-06', '13:00', now)).toBe(true);
  });

  it('flags meetings starting within 24 hours as late', () => {
    expect(isMeetingRequestLate('2026-10-07', '11:00', now)).toBe(true);
    expect(isMeetingRequestLate('2026-10-07', '12:00', now)).toBe(true);
  });

  it('does not flag meetings more than 24 hours away', () => {
    expect(isMeetingRequestLate('2026-10-07', '12:01', now)).toBe(false);
    expect(isMeetingRequestLate('2026-10-10', '09:00', now)).toBe(false);
  });

  it('returns false for missing or invalid dates', () => {
    expect(isMeetingRequestLate(null, '10:00', now)).toBe(false);
    expect(isMeetingRequestLate('not-a-date', '10:00', now)).toBe(false);
  });
});
