import { VotingRecordController } from '@/server/modules/voting-record/voting-record.controller';
import { forbidden, requireCapability } from '@/server/auth/api-auth';

/**
 * @swagger
 * /api/voting-record:
 *   get:
 *     summary: Returns every non-secret-ballot voting record. Requires readRecords.
 *     responses:
 *       200:
 *         description: A JSON array of voting record objects.
 */
export async function GET() {
  const { error } = await requireCapability('readRecords');
  if (error) return error;
  return VotingRecordController.getAllVotingRecords();
}

/**
 * @swagger
 * /api/voting-record:
 *   post:
 *     summary: Casts the signed-in senator's vote. Requires vote.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with voting record data:
 *       - votingEventId (string, required)
 *       - result (string, required)
 *       The voter is always the signed-in user; a userId in the body is ignored.
 *     responses:
 *       201:
 *         description: The created voting record object.
 *       400:
 *         description: Missing required fields or invalid data.
 *       404:
 *         description: Voting event not found.
 *       409:
 *         description: Already voted, or the vote has ended.
 */
export async function POST(request: Request) {
  const auth = await requireCapability('vote');
  if (auth.error) return auth.error;
  // A Senate seat without a portal profile has no one to record the vote for.
  if (!auth.actor.user) return forbidden();
  return VotingRecordController.createVotingRecord(request, {
    userId: auth.actor.user.userId,
  });
}
