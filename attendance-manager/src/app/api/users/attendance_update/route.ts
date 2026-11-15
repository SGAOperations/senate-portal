import { UsersController } from '@/server/modules/users/users.controller';
import { MeetingService } from '@/server/modules/meeting/meeting.service';
import { can, forbidden, isSelf, requireAuth } from '@/server/auth/api-auth';
import type { Actor } from '@/server/auth/sgauth';

/**
 * Sets one member's attendance for a meeting. Whoever manages attendance may
 * set any status (check-in). Anyone else may only mark their own record
 * PENDING for a meeting that has not started yet: that is how an absence
 * request begins (MeetingsPage). Without the start-time check, a member could
 * turn a past unexcused absence back into PENDING.
 */
export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (
    !can(auth.actor, 'manageAttendance') &&
    !(await isOwnPendingForUpcomingMeeting(auth.actor, request))
  ) {
    return forbidden();
  }
  return UsersController.updateAttendence(request);
}

async function isOwnPendingForUpcomingMeeting(
  actor: Actor,
  request: Request,
): Promise<boolean> {
  // read a copy: the controller reads the body again
  const body = await request
    .clone()
    .json()
    .catch(() => null);
  if (
    body?.status !== 'PENDING' ||
    typeof body.userId !== 'string' ||
    typeof body.meetingId !== 'string' ||
    !isSelf(actor, body.userId)
  ) {
    return false;
  }
  const meeting = await MeetingService.getMeetingById(body.meetingId);
  return meeting !== null && meeting.startTime > new Date();
}
