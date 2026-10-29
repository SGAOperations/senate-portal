import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';
import { RequestService } from '@/request/request.service';

// GET all requests (for admins)
export async function GET() {
  try {
    const requests = await RequestService.getAllRequests();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch requests';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
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
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to create request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
