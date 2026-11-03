import { NextRequest, NextResponse } from 'next/server';
import { AttendanceController } from '../../../../attendance/attendance.controller';
import { requireCapability } from '@/utils/api-auth';

/**
 * Updates an Attendance Status based on request
 * @description Updates an Attendance Record's Status by attendanceId
 * @body UpdateAttendanceRequestParams
 * @response AttendanceResponse
 * @openapi
 */
// manageAttendance only, like PATCH /api/attendance/[attendanceId]: this decides
// whether an absence is excused (Bylaws XIV §4.4).
export async function PUT(req: NextRequest) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  try {
    const { requestId, status } = await req.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing requestId or status' },
        { status: 400 },
      );
    }

    const updatedAttendance = await AttendanceController.updateAttendanceStatus(
      requestId,
      status,
    );
    return NextResponse.json(updatedAttendance);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update attendance status' },
      { status: 400 },
    );
  }
}
