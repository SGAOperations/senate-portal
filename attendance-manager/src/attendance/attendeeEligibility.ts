import { prisma } from '../lib/prisma';
import { MeetingType, Prisma, RoleType } from '../generated/prisma';

/**
 * E-board members are only tracked on FULL_BODY meetings. Regular meetings
 * are for general members, so e-board attendance rows on them are ignored and
 * new ones are rejected.
 */

export class IneligibleAttendeeError extends Error {
  constructor(
    message = 'E-board members are not tracked for regular meetings',
  ) {
    super(message);
    this.name = 'IneligibleAttendeeError';
  }
}

/** Attendance `where` fragment that hides e-board rows on regular meetings. */
export const excludeEboardOnRegularMeetings: Prisma.AttendanceWhereInput = {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Prisma operator
  NOT: {
    meeting: { type: MeetingType.REGULAR },
    user: { role: { roleType: RoleType.EBOARD } },
  },
};

type Client = Prisma.TransactionClient | typeof prisma;

export function canAttendMeetingType(
  meetingType: MeetingType | string,
  roleType: RoleType | string | undefined,
) {
  return meetingType !== MeetingType.REGULAR || roleType !== RoleType.EBOARD;
}

/** Drops user IDs that are not allowed on a meeting of the given type. */
export async function filterEligibleAttendeeIds(
  meetingType: MeetingType,
  userIds: string[],
  client: Client = prisma,
) {
  if (meetingType !== MeetingType.REGULAR || userIds.length === 0) {
    return userIds;
  }
  const eboard = await client.user.findMany({
    where: { userId: { in: userIds }, role: { roleType: RoleType.EBOARD } },
    select: { userId: true },
  });
  const eboardIds = new Set(eboard.map((user) => user.userId));
  return userIds.filter((userId) => !eboardIds.has(userId));
}

/** Throws IneligibleAttendeeError if the user can't be on this meeting. */
export async function assertEligibleAttendee(
  meetingId: string,
  userId: string,
  client: Client = prisma,
) {
  const [meeting, user] = await Promise.all([
    client.meeting.findUnique({
      where: { meetingId },
      select: { type: true },
    }),
    client.user.findUnique({
      where: { userId },
      select: { role: { select: { roleType: true } } },
    }),
  ]);
  if (
    meeting &&
    user &&
    !canAttendMeetingType(meeting.type, user.role.roleType)
  ) {
    throw new IneligibleAttendeeError();
  }
}
