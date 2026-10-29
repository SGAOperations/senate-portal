import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';

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
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
