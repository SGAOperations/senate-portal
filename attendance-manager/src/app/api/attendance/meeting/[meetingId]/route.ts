import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '@/server/modules/attendance/attendance.controller';
import { canAny, requireAuth } from '@/server/auth/api-auth';

/**
 * Get Meeting Attendance
 * @description Gets all attendances associated with a meeting. Staff with
 * manageAttendance or readRecords get every record; anyone else only their own.
 * @body GetAttendanceMeetingParams
 * @response GetMeetingAttendanceResponse
 * @openapi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  try {
    const { meetingId } = await params;
    const attendance =
      await AttendanceController.getMeetingAttendance(meetingId);
    if (canAny(auth.actor, 'manageAttendance', 'readRecords')) {
      return NextResponse.json(attendance);
    }
    // Members still need their own record: the vote popup checks it
    // (Layout.tsx) to see whether they are marked present.
    const ownUserId = auth.actor.user?.userId;
    return NextResponse.json(
      attendance.filter((record) => record.userId === ownUserId),
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meeting attendance' },
      { status: 400 },
    );
  }
}
