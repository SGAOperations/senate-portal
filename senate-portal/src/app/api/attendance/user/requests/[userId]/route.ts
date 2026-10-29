import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '@/attendance/attendance.controller';

/**
 * Get User Requests
 * @description Gets requests associated with a user
 * @body GetUserAttendanceParams
 * @response GetUserRequestsResponse
 * @openapi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const attendance = await AttendanceController.getRequestsByUser(userId);
    return NextResponse.json(attendance);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user attendance' },
      { status: 400 },
    );
  }
}
