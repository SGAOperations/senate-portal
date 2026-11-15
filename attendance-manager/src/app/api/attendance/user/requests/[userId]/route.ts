import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '@/server/modules/attendance/attendance.controller';
import { requireSelfOrCapability } from '@/server/auth/api-auth';

/**
 * Get User Requests
 * @description Gets requests associated with a user. The user themselves, or
 * manageAttendance or readRecords.
 * @body GetUserAttendanceParams
 * @response GetUserRequestsResponse
 * @openapi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { error } = await requireSelfOrCapability(
    userId,
    'manageAttendance',
    'readRecords',
  );
  if (error) return error;
  try {
    const attendance = await AttendanceController.getRequestsByUser(userId);
    return NextResponse.json(attendance);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user attendance' },
      { status: 400 },
    );
  }
}
