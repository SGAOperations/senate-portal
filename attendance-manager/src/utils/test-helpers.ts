import { prisma } from '@/lib/prisma';
import { randomUUID } from 'node:crypto';
import { SemesterService } from '@/semester/semester.service';
import type { Capability } from '@/lib/permissions';
import * as sgauth from '@/lib/sgauth';
import type { Actor } from '@/lib/sgauth';

/**
 * Cleans up all test data in the correct order to respect foreign key constraints.
 *
 * Deletion order (must be sequential to respect foreign keys):
 * 1. Request (references Attendance)
 * 2. Attendance (references User and Meeting)
 * 3. User (references Role) - MUST be deleted before Role
 * 4. Meeting (referenced by Attendance, but no dependencies itself)
 * 5. Role (referenced by User) - MUST be deleted after User
 *
 * This function should be used in beforeAll/afterAll hooks to ensure
 * tests don't fail due to foreign key constraint violations.
 */
export async function cleanupTestData() {
  // Delete in strict order to respect foreign key constraints
  // Each await ensures the previous deletion completes before the next
  await prisma.votingRecord.deleteMany();
  await prisma.votingEvent.deleteMany();
  await prisma.request.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.semester.deleteMany();
}

/**
 * Semester id for a meeting date, for fixtures that create meetings directly
 * through Prisma instead of MeetingService.createMeeting.
 */
export function semesterIdFor(date: Date): Promise<string> {
  return SemesterService.getOrCreateSemesterIdForDate(date);
}

/**
 * An SGAuth session for tests. Pair it with this in the test file (jest.mock
 * is hoisted, so it cannot live here):
 *
 *   const mockGetSession = jest.fn();
 *   jest.mock('@nusgaops/sgauth', () => ({
 *     ...jest.requireActual('@nusgaops/sgauth'),
 *     createSgauthClient: () => ({ getSession: () => mockGetSession() }),
 *   }));
 *   jest.mock('next/headers', () => ({ headers: async () => new Headers() }));
 *
 * then `mockGetSession.mockResolvedValue(sgauthSession({ ... }))`.
 */
export function sgauthSession({
  id,
  email,
  name = 'Test User',
  positions = [],
}: {
  id: string;
  email: string;
  name?: string;
  positions?: string[];
}) {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  return {
    user: {
      id,
      email,
      name,
      preferredName: null,
      isAdmin: false,
      isPrimaryAdmin: false,
    },
    positions: positions.map((key) => ({ key, name: key })),
    session: {
      id: `session-${id}`,
      expiresAt: later,
      absoluteExpiresAt: later,
      createdAt: now.toISOString(),
    },
  };
}

/**
 * Stands in for the Role rows fixtures used to make: a tag stored as a
 * position key on each fixture user (`positionKeys: [group.roleId]`), so a
 * test can delete the users it made with deleteTestGroup. It grants nothing.
 */
export async function createTestGroup() {
  return { roleId: `test-group-${randomUUID()}` };
}

/** Hard-deletes every user tagged with this group. */
export async function deleteTestGroup(groupId: string) {
  await prisma.user.deleteMany({ where: { positionKeys: { has: groupId } } });
}

/**
 * An Actor for stubbing route guards (requireAuth, requireCapability)
 * without SGAuth. `userId` null is staff without a profile.
 */
export function testActor({
  userId = 'test-actor',
  capabilities = [],
  sgauthUserId = 'test-actor-sgauth',
}: {
  userId?: string | null;
  capabilities?: Capability[];
  sgauthUserId?: string;
} = {}): Actor {
  return {
    session: sgauthSession({
      id: sgauthUserId,
      email: `${sgauthUserId}@example.com`,
    }) as Actor['session'],
    capabilities: new Set(capabilities),
    user: userId ? ({ userId } as Actor['user']) : null,
  };
}

/**
 * Signs a test in as `actor` (or out, with null) for every route guard, by
 * stubbing the one place they all resolve the session. Undo with
 * jest.restoreAllMocks() or the returned spy's mockRestore().
 */
export function signInAsActor(actor: Actor | null) {
  // only ever called from tests, where jest is a global
  // eslint-disable-next-line no-undef
  return jest
    .spyOn(sgauth, 'resolveActor')
    .mockResolvedValue(actor ? { status: 'ok', actor } : { status: 'none' });
}

/** The capabilities the old EBOARD role stood for, for tests written against it. */
export const STAFF_CAPABILITIES: Capability[] = [
  'manageAttendance',
  'hostVotes',
  'manageSemesters',
  'readRecords',
];
