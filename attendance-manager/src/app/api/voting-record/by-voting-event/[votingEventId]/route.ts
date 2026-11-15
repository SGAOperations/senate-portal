import { VotingRecordController } from '@/server/modules/voting-record/voting-record.controller';
import { requireAnyCapability } from '@/server/auth/api-auth';

/**
 * @swagger
 * /api/voting-record/by-voting-event/{votingEventId}:
 *   get:
 *     summary: Returns voting records filtered by voting event ID. Requires hostVotes or readRecords; 403 for secret ballots.
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
  const { error } = await requireAnyCapability('hostVotes', 'readRecords');
  if (error) return error;
  const { votingEventId } = await params;
  return VotingRecordController.getVotingRecordsByVotingEvent({
    votingEventId,
  });
}
