import { MeetingController } from '@/server/modules/meeting/meeting.controller';
import { requireAuth } from '@/server/auth/api-auth';

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
  const { error } = await requireAuth();
  if (error) return error;
  return MeetingController.listMeetingsByDate();
}
