import { VotingController } from '@/voting/voting.controller';
import { requireAuth } from '@/utils/api-auth';

/**
 * @swagger
 * /api/voting-event/by-type/{voteType}:
 *   get:
 *     summary: Returns voting events filtered by vote type.
 *     parameters:
 *       - in: path
 *         name: voteType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON array of voting event objects matching the vote type.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ voteType: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;
  const { voteType } = await params;
  return VotingController.getVotingEventsByVoteType({ voteType });
}
