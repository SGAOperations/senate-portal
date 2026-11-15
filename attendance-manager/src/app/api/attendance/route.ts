import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '@/server/modules/attendance/attendance.controller';
import { requireCapability } from '@/server/auth/api-auth';

/**
 * Posts an Attendance
 * @description Creates a new Attendance Record with params. Requires manageAttendance.
 * @body PostAttendanceParams
 * @response AttendanceResponse
 * @openapi
 */
export async function POST(req: NextRequest) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  try {
    const data = await req.json();
    const attendance = await AttendanceController.createAttendance(data);
    return NextResponse.json(attendance, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create attendance' },
      { status: 400 },
    );
  }
}
