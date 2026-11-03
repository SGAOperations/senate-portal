import { NextResponse } from 'next/server';
import { MeetingController } from '@/server/modules/meeting/meeting.controller';
import { requireAuth } from '@/server/auth/api-auth';

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
