import { MeetingController } from '@/meeting/meeting.controller';

export async function GET() {
  return MeetingController.listUpcomingMeetings();
}
