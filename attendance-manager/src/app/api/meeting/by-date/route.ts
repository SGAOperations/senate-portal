import { MeetingController } from '@/meeting/meeting.controller';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns a list of meetings binned by date.
 *     responses:
 *       200:
 *         description: A JSON array of array of meeting objects.
 */
export async function GET() {
  return MeetingController.listMeetingsByDate();
}
