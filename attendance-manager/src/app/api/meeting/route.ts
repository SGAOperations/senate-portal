import { MeetingController } from '@/meeting/meeting.controller';
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
  return MeetingController.listMeetings();
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
  return MeetingController.createMeeting(request);
}
