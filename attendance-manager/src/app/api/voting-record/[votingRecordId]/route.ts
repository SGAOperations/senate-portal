import { VotingRecordController } from '@/server/modules/voting-record/voting-record.controller';
import { requireCapability } from '@/server/auth/api-auth';

/**
 * @swagger
 * /api/voting-record/{votingRecordId}:
 *   patch:
 *     summary: Corrects an existing voting record. Requires hostVotes; updatedBy is the signed-in host.
 *     parameters:
 *       - in: path
 *         name: votingRecordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - result
 *             properties:
 *               result:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated voting record.
 *       400:
 *         description: Invalid body, completed event, or invalid result.
 *       403:
 *         description: Secret ballot events cannot have per-record edits.
 *       404:
 *         description: Voting record not found.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ votingRecordId: string }> },
) {
  // Hosts correct votes (OngoingVotingPanel); voters cannot change their own.
  const auth = await requireCapability('hostVotes');
  if (auth.error) return auth.error;
  const { votingRecordId } = await params;
  return VotingRecordController.updateVotingRecord(
    request,
    { votingRecordId },
    { updatedBy: auth.actor.user?.userId ?? auth.actor.session.user.id },
  );
}
