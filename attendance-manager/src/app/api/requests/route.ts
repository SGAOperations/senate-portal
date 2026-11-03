import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';
import { RequestService } from '@/request/request.service';
import { toErrorResponse } from '@/utils/api-errors';
import {
  can,
  forbidden,
  requireAuth,
  requireCapability,
} from '@/utils/api-auth';
import { attendanceOwner } from '@/utils/ownership';

// GET all requests (readRecords)
export async function GET() {
  const { error } = await requireCapability('readRecords');
  if (error) return error;
  try {
    const requests = await RequestService.getAllRequests();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch requests');
  }
}

// POST create new request
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { actor } = auth;
  try {
    const { attendanceId, reason, attendanceMode, timeAdjustment } =
      await req.json();

    if (!attendanceId || !reason || !attendanceMode) {
      return NextResponse.json(
        {
          error: 'attendanceId, reason, and attendanceMode are required',
        },
        { status: 400 },
      );
    }

    // A member files requests for their own attendance only.
    const owner = await attendanceOwner(attendanceId);
    if (!owner) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 },
      );
    }
    if (owner !== actor.user?.userId && !can(actor, 'manageAttendance')) {
      return forbidden();
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
