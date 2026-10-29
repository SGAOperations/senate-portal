import { requireAuth } from '@/utils/api-auth';
import { VotingRecordController } from '@/voting-record/voting-record.controller';
import { NextResponse } from 'next/server';

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
  const { user } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 403 });
  }
  const { votingEventId } = await params;
  return VotingRecordController.getHasUserVoted({
    votingEventId,
    userId: user?.userId,
  });
}
