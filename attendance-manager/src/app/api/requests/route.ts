import { NextResponse } from 'next/server';
import { RequestController } from '@/server/modules/request/request.controller';
import { RequestService } from '@/server/modules/request/request.service';
import { toErrorResponse } from '@/server/http/api-errors';
import { requireAnyCapability } from '@/server/auth/api-auth';
import { guardFileRequest } from '@/server/modules/request/request.guards';

// GET all requests (manageAttendance or readRecords)
export async function GET() {
  const { error } = await requireAnyCapability(
    'manageAttendance',
    'readRecords',
  );
  if (error) return error;
  try {
    const requests = await RequestService.getAllRequests();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch requests');
  }
}

// POST create new request, for the caller's own attendance record
export async function POST(req: Request) {
  try {
    const { attendanceId, reason, attendanceMode, timeAdjustment } =
      await req.json();

    const denied = await guardFileRequest(attendanceId);
    if (denied) return denied;

    if (!attendanceId || !reason || !attendanceMode) {
      return NextResponse.json(
        {
          error: 'attendanceId, reason, and attendanceMode are required',
        },
        { status: 400 },
      );
    }

    const newRequest = await RequestController.createRequest({
      attendanceId,
      reason,
      attendanceMode,
      timeAdjustment: timeAdjustment || undefined,
    });

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to create request');
  }
}
