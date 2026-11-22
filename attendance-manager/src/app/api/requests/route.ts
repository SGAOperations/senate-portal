import { NextResponse } from 'next/server';
import { RequestController } from '@/server/modules/request/request.controller';
import { RequestService } from '@/server/modules/request/request.service';
import { toErrorResponse } from '@/server/http/api-errors';

// GET all requests (for admins)
export async function GET() {
  try {
    const requests = await RequestService.getAllRequests();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch requests');
  }
}

// POST create new request
export async function POST(req: Request) {
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
