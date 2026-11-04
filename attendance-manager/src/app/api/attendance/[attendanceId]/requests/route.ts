import { NextResponse } from 'next/server';
import { RequestController } from '@/server/modules/request/request.controller';
import { toErrorResponse } from '@/server/http/api-errors';

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
  try {
    const { attendanceId } = await params;
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
