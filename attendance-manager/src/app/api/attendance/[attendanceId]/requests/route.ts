import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';
import { toErrorResponse } from '@/utils/api-errors';
import { can, forbidden, requireAuth } from '@/utils/api-auth';
import { attendanceOwner } from '@/utils/ownership';

/**
 * Create a new Request
 * @description Creates a new Request for specific attendanceId
 * @body CreateAttendanceRequestParams
 * @response CreateAttendanceRequestResponse
 * @openapi
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ attendanceId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { actor } = auth;
  try {
    const { attendanceId } = await params;
    const owner = await attendanceOwner(attendanceId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 },
      );
    }
    if (owner !== actor.user?.userId && !can(actor, 'manageAttendance')) {
      return forbidden();
    }
    const { reason, attendanceMode, timeAdjustment } = await req.json();

    if (!reason || !attendanceMode) {
      return NextResponse.json(
        { error: 'reason and attendanceMode are required' },
        { status: 400 },
      );
    }

    const newRequest = await RequestController.createRequest({
      attendanceId,
      reason,
      attendanceMode,
      timeAdjustment,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to create request');
  }
}
