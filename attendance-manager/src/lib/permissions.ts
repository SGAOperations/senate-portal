/**
 * What each SGAuth position may do in the portal. Positions are the only
 * source of authority: the portal has no roles of its own. Browser-safe (no
 * server imports), so the client can use it to show or hide controls -- the
 * server checks every one of these again on each route.
 */

export type Capability =
  /** Cast a vote (Bylaws XIV §1.2). */
  | 'vote'
  /** Be on the attendance roster; see own attendance, file excusal requests. */
  | 'roster'
  /** Approve or deny excusal requests, take and edit attendance, run meetings. */
  | 'manageAttendance'
  /** Open, close and correct votes, secret ballots included. No vote of their own. */
  | 'hostVotes'
  /** Edit semester dates. */
  | 'manageSemesters'
  /** Read everyone's attendance and non-secret votes. */
  | 'readRecords'
  /** Everything above except vote and roster, plus editing member profiles. */
  | 'superadmin';

const VICE_PRESIDENT_PREFIX = 'vice-president-of-';

/** The SGAuth position that holds a vote in the Senate (Bylaws XIV §1.2). */
export const SENATOR_POSITION = 'senator';

const POSITIONS: Record<Capability, readonly string[]> = {
  vote: [SENATOR_POSITION],
  roster: [
    SENATOR_POSITION,
    'parliamentarian',
    'student-body-president',
    'executive-vice-president',
    // every vice-president-of-* key, matched by prefix below
  ],
  manageAttendance: ['speaker-of-the-senate', 'senate-operations-coordinator'],
  hostVotes: [
    'speaker-of-the-senate',
    'senate-operations-coordinator',
    'vice-president-of-operational-affairs',
  ],
  manageSemesters: [
    'speaker-of-the-senate',
    'vice-president-of-operational-affairs',
  ],
  readRecords: [
    'speaker-of-the-senate',
    'senate-operations-coordinator',
    'vice-president-of-operational-affairs',
    'student-body-president',
    'executive-vice-president',
  ],
  superadmin: [
    'digital-innovation-manager',
    'digital-innovation-senateportal-team-lead',
    'vice-president-of-operational-affairs',
    'senate-operations-coordinator',
  ],
};

/** A superadmin holds these too. Voting and the roster stay with the seat. */
const SUPERADMIN_GRANTS: readonly Capability[] = [
  'manageAttendance',
  'hostVotes',
  'manageSemesters',
  'readRecords',
];

/** Whether a position key puts its holder on the roster. */
export function isRosterPosition(key: string): boolean {
  return (
    POSITIONS.roster.includes(key) || key.startsWith(VICE_PRESIDENT_PREFIX)
  );
}

/** Every capability the given position keys grant. */
export function capabilitiesFor(positionKeys: readonly string[]): Capability[] {
  const granted = new Set<Capability>();
  for (const capability of Object.keys(POSITIONS) as Capability[]) {
    const matches =
      capability === 'roster'
        ? positionKeys.some(isRosterPosition)
        : positionKeys.some((key) => POSITIONS[capability].includes(key));
    if (matches) granted.add(capability);
  }
  if (granted.has('superadmin')) {
    for (const capability of SUPERADMIN_GRANTS) granted.add(capability);
  }
  return [...granted].sort();
}

/** The position keys that put someone on the roster, for database filters. */
export const ROSTER_POSITION_KEYS = POSITIONS.roster;
export { VICE_PRESIDENT_PREFIX };
