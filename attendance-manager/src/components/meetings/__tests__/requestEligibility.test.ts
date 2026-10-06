import { isMeetingRequestEligible } from '../meetings.utils';

describe('isMeetingRequestEligible', () => {
  it('includes same-day meetings that start later today', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(isMeetingRequestEligible('2026-10-06', '13:00', now)).toBe(true);
  });

  it('excludes meetings that already started', () => {
    const now = new Date('2026-10-06T12:00:00');

    expect(isMeetingRequestEligible('2026-10-06', '11:00', now)).toBe(false);
  });
});
