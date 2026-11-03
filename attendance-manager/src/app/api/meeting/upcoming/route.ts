import { MeetingController } from '@/meeting/meeting.controller';
import { requireAuth } from '@/utils/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return MeetingController.listUpcomingMeetings();
}
