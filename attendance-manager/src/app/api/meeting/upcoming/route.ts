import { MeetingController } from '@/server/modules/meeting/meeting.controller';

export async function GET() {
  return MeetingController.listUpcomingMeetings();
}
