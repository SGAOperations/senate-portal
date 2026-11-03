import { NextResponse } from 'next/server';
import { can, requireCapability, requireProfile } from '@/utils/api-auth';
import { VotingRecordController } from '@/voting-record/voting-record.controller';

/**
 * @swagger
 * /api/voting-record:
 *   get:
 *     summary: Returns a list of all voting records (readRecords). Secret-ballot records carry no userId.
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
 *     summary: Casts the signed-in Senator's vote.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with voting record data:
 *       - votingEventId (string, required)
 *       - result (string, required)
 *     responses:
 *       201:
 *         description: The created voting record object.
 *       400:
 *         description: Missing required fields, invalid data, or the vote has ended.
 *       403:
 *         description: The signed-in user does not hold a Senate seat.
 */
export async function POST(request: Request) {
  const auth = await requireProfile();
  if (auth.error) return auth.error;
  // Only Senators vote (Bylaws XIV §1.2). The seat comes from the SGAuth
  // session's positions, not from anything the portal or the client says.
  if (!can(auth.actor, 'vote')) {
    return NextResponse.json(
      { error: 'Only Senators can vote' },
      { status: 403 },
    );
  }
  return VotingRecordController.createVotingRecord(request, {
    userId: auth.user.userId,
  });
}
