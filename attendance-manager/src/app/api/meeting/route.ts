import { MeetingController } from '@/meeting/meeting.controller';
import { can, requireAuth, requireCapability } from '@/utils/api-auth';
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Returns a list of meetings.
 *     responses:
 *       200:
 *         description: A JSON array of array of meeting objects.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return MeetingController.listMeetings({
    full: can(auth.actor, 'readRecords'),
  });
}

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Posts a single user with the given request.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with user data:
 *     responses:
 *       201:
 *         description: A JSON array of user objects.
 *       400:
 *         description: Missing required fields.
 */
export async function POST(request: Request) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  return MeetingController.createMeeting(request);
}
