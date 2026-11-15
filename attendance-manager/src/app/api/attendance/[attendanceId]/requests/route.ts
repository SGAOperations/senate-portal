import { NextResponse } from 'next/server';
import { RequestController } from '@/server/modules/request/request.controller';
import { toErrorResponse } from '@/server/http/api-errors';
import { guardFileRequest } from '@/server/modules/request/request.guards';

/**
 * Create a new Request
 * @description Creates a new Request for specific attendanceId. The attendance
 * record must be the caller's own, unless they have manageAttendance.
 * @body CreateAttendanceRequestParams
 * @response CreateAttendanceRequestResponse
 * @openapi
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ attendanceId: string }> },
) {
  try {
    const { attendanceId } = await params;
    const denied = await guardFileRequest(attendanceId);
    if (denied) return denied;
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
