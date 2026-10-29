import { NextResponse } from 'next/server';
import { VotingController } from '@/voting/voting.controller';
import { requireAuth } from '@/utils/api-auth';

/**
 * @swagger
 * /api/voting-event/{id}:
 *   get:
 *     summary: Returns a single voting event by ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A voting event object.
 *       404:
 *         description: Voting event not found.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return VotingController.getVotingEvent({ votingEventId: id });
}

/**
 * @swagger
 * /api/voting-event/{id}:
 *   put:
 *     summary: Updates an existing voting event.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with voting event updates:
 *       - meetingId (string, optional)
 *       - name (string, optional)
 *       - voteType (string, optional)
 *       - updatedBy (string, optional)
 *       - deletedAt (Date | null, optional)
 *     responses:
 *       200:
 *         description: The updated voting event object.
 *       400:
 *         description: Invalid data.
 *       404:
 *         description: Voting event not found.
 */
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
  return VotingController.updateVotingEvent(request, { votingEventId: id });
}
