import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '../../../../../attendance/attendance.controller';
import { can, requireAuth } from '@/utils/api-auth';

/**
 * Get Meeting Attendance
 * @description Gets all attendances associated with a meeting
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
  const { actor } = auth;
  try {
    const { meetingId } = await params;
    const attendance =
      await AttendanceController.getMeetingAttendance(meetingId);
    // A member sees only their own record (the voting check-in needs it);
    // readRecords sees everyone's, with NUIDs and request reasons.
    return NextResponse.json(
      can(actor, 'readRecords')
        ? attendance
        : attendance.filter((record) => record.userId === actor.user?.userId),
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meeting attendance' },
      { status: 400 },
    );
  }
}
