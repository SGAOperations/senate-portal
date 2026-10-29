import { VotingRecordController } from '@/voting-record/voting-record.controller';

/**
 * @swagger
 * /api/voting-record/{votingRecordId}:
 *   patch:
 *     summary: Updates an existing voting record (e.g. admin corrects a vote while the event is ongoing).
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
 *               updatedBy:
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
  const { votingRecordId } = await params;
  return VotingRecordController.updateVotingRecord(request, {
    votingRecordId,
  });
}
