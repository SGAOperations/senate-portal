import { NextResponse } from 'next/server';
import { VotingController } from '@/voting/voting.controller';
import { requireAuth } from '@/utils/api-auth';

/**
 * @swagger
 * /api/voting-event:
 *   get:
 *     summary: Returns a list of all voting events.
 *     responses:
 *       200:
 *         description: A JSON array of voting event objects.
 */
export async function GET() {
  return VotingController.getAllVotingEvents();
}

/**
 * @swagger
 * /api/voting-event:
 *   post:
 *     summary: Creates a new voting event.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with voting event data:
 *       - meetingId (string, required)
 *       - name (string, required)
 *       - voteType (string, required)
 *       - updatedBy (string, optional)
 *     responses:
 *       201:
 *         description: The created voting event object.
 *       400:
 *         description: Missing required fields or invalid data.
 */
export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role.roleType !== 'EBOARD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return VotingController.createVotingEvent(request);
}
