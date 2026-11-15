import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '@/server/modules/attendance/attendance.controller';
import { requireSelfOrCapability } from '@/server/auth/api-auth';

/**
 * Get Remaining Abscences
 * @description Gets remaining abscences for a user. The user themselves, or
 * manageAttendance or readRecords.
 * @body GetUserAttendanceParams
 * @response GetRemainingAbscencesResponse
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
    const remainingAbsences =
      await AttendanceController.getRemainingUnexcusedAbsences(userId);
    return NextResponse.json(remainingAbsences);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch remaining unexcused absences',
      },
      { status: 400 },
    );
  }
}
