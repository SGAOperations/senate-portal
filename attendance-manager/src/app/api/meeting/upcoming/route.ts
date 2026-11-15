import { MeetingController } from '@/server/modules/meeting/meeting.controller';
import { requireAuth } from '@/server/auth/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return MeetingController.listUpcomingMeetings();
}
