import { MeetingController } from '@/meeting/meeting.controller';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return MeetingController.getMeeting({ meetingId: id });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return MeetingController.updateMeeting(request, { meetingId: id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return MeetingController.deleteMeeting({ meetingId: id });
}
