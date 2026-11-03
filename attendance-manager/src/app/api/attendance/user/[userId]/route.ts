import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '../../../../../attendance/attendance.controller';
import { requireSelfOr } from '@/utils/api-auth';

/**
 * Get User Attendance
 * @description Gets all attendances associated with a user
 * @body GetUserAttendanceParams
 * @response GetUserAttendanceResponse
 * @openapi
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { error } = await requireSelfOr(userId, 'readRecords');
  if (error) return error;
  try {
    const attendance = await AttendanceController.getUserAttendance(userId);
    return NextResponse.json(attendance);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user attendance' },
      { status: 400 },
    );
  }
}
