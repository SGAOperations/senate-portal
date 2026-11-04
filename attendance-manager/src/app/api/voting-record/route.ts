import { VotingRecordController } from '@/voting-record/voting-record.controller';

/**
 * @swagger
 * /api/voting-record:
 *   get:
 *     summary: Returns a list of all voting records.
 *     responses:
 *       200:
 *         description: A JSON array of voting record objects.
 */
export async function GET() {
  return VotingRecordController.getAllVotingRecords();
}

/**
 * @swagger
 * /api/voting-record:
 *   post:
 *     summary: Creates a new voting record.
 *     @param {Request} request - The incoming request object, expected to contain a JSON body with voting record data:
 *       - votingEventId (string, required)
 *       - userId (string, required)
 *       - result (string, required)
 *       - updatedBy (string, optional)
 *     responses:
 *       201:
 *         description: The created voting record object.
 *       400:
 *         description: Missing required fields or invalid data.
 */
export async function POST(request: Request) {
  return VotingRecordController.createVotingRecord(request);
}
