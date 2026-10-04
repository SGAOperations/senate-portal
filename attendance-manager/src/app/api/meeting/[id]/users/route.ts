import { NextResponse } from 'next/server';
import { MeetingController } from '@/meeting/meeting.controller';
import { AttendanceController } from '@/attendance/attendance.controller';
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns all users associated with the meeting
 *     responses:
 *       200:
 *         description: A JSON array of array of meeting objects.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return MeetingController.getUsers({ meetingId: id });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params; // necessary
  const body = await request.json();
  const result = await AttendanceController.updateMeetingAttendees(
    id,
    body.userIds,
  );
  // return JSON with the payload (e.g. count)
  return NextResponse.json(result); // type: Response
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const result = await AttendanceController.addMeetingAttendee(id, body.userId);
  return NextResponse.json(result, { status: 201 });
}
