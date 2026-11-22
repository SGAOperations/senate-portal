import { requireAuth } from '@/server/auth/api-auth';
import { NextResponse } from 'next/server';
import { VotingRecordController } from '@/server/modules/voting-record/voting-record.controller';

/**
 * @swagger
 * /api/voting-record/has-voted/{votingEventId}:
 *   get:
 *     summary: Returns if the user has voted on this event.
 *     parameters:
 *       - in: path
 *         name: votingEventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A boolean on if the user has voted or not.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ votingEventId: string }> },
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { votingEventId } = await params;
  // Staff without a profile have no vote to have cast.
  if (!auth.actor.user) return NextResponse.json({ hasVoted: false });
  return VotingRecordController.getHasUserVoted({
    votingEventId,
    userId: auth.actor.user.userId,
  });
}
