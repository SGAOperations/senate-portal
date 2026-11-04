import { VotingRecordController } from '@/voting-record/voting-record.controller';

/**
 * @swagger
 * /api/voting-record/by-voting-event/{votingEventId}:
 *   get:
 *     summary: Returns voting records filtered by voting event ID.
 *     parameters:
 *       - in: path
 *         name: votingEventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A JSON array of voting record objects for the specified voting event.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ votingEventId: string }> },
) {
  const { votingEventId } = await params;
  return VotingRecordController.getVotingRecordsByVotingEvent({
    votingEventId,
  });
}
