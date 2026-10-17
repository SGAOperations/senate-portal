import { NextResponse } from 'next/server';
import { MeetingController } from '@/meeting/meeting.controller';
import { requireAuth } from '@/utils/api-auth';

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
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role.roleType !== 'EBOARD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  return MeetingController.updateMeeting(request, { meetingId: id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role.roleType !== 'EBOARD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  return MeetingController.deleteMeeting({ meetingId: id });
}
