import { capabilitiesFor, isRosterPosition } from '@/lib/permissions';

// The position-to-capability map, case by case from the requirements.
describe('capabilitiesFor', () => {
  it.each([
    ['senator', ['roster', 'vote']],
    ['parliamentarian', ['roster']],
    ['student-body-president', ['readRecords', 'roster']],
    ['executive-vice-president', ['readRecords', 'roster']],
    ['vice-president-of-academic-affairs', ['roster']],
    [
      'vice-president-of-operational-affairs',
      [
        'hostVotes',
        'manageAttendance',
        'manageSemesters',
        'readRecords',
        'roster',
        'superadmin',
      ],
    ],
    [
      'speaker-of-the-senate',
      ['hostVotes', 'manageAttendance', 'manageSemesters', 'readRecords'],
    ],
    [
      'senate-operations-coordinator',
      [
        'hostVotes',
        'manageAttendance',
        'manageSemesters',
        'readRecords',
        'superadmin',
      ],
    ],
    [
      'digital-innovation-manager',
      [
        'hostVotes',
        'manageAttendance',
        'manageSemesters',
        'readRecords',
        'superadmin',
      ],
    ],
    [
      'digital-innovation-senateportal-team-lead',
      [
        'hostVotes',
        'manageAttendance',
        'manageSemesters',
        'readRecords',
        'superadmin',
      ],
    ],
    ['information-manager', []],
    ['assistant-vice-president-of-external-affairs', []],
    ['digital-innovation-senateportal-team-member', []],
  ])('%s grants %j', (key, expected) => {
    expect(capabilitiesFor([key])).toEqual(expected);
  });

  it('combines the capabilities of several positions', () => {
    expect(capabilitiesFor(['senator', 'speaker-of-the-senate'])).toEqual([
      'hostVotes',
      'manageAttendance',
      'manageSemesters',
      'readRecords',
      'roster',
      'vote',
    ]);
  });

  it('grants nothing for no positions', () => {
    expect(capabilitiesFor([])).toEqual([]);
  });
});

describe('isRosterPosition', () => {
  it('matches every vice-president-of-* key and nothing similar', () => {
    expect(isRosterPosition('vice-president-of-student-success')).toBe(true);
    expect(
      isRosterPosition('assistant-vice-president-of-external-affairs'),
    ).toBe(false);
    expect(isRosterPosition('speaker-of-the-senate')).toBe(false);
  });
});
