import { NextResponse } from 'next/server';
import { VoteType, yesNoOptions } from '@/lib/constants';
import { VotingRecordService } from './voting-record.service';
import { z } from 'zod';

// Define the expected structure of the request body using Zod
const createVotingRecordSchema = z.object({
  votingEventId: z.string().min(1),
  userId: z.string().min(1),
  result: z.string().min(1),
  updatedBy: z.string().nullish(),
});

const rollCallStyleResults = new Set<string>([
  ...Object.values(yesNoOptions),
  'YES',
  'NO',
  'ABSTAIN',
]);

function isValidVotingRecordResult(
  voteType: string,
  options: string[],
  result: string,
): boolean {
  if (voteType === VoteType.rollCall) {
    return rollCallStyleResults.has(result);
  }
  if (options.length > 0) {
    return options.includes(result);
  }
  return rollCallStyleResults.has(result);
}

export const VotingRecordController = {
  async getAllVotingRecords() {
    const votingRecords = await VotingRecordService.getAllVotingRecords();
    return NextResponse.json(votingRecords);
  },

  async getHasUserVoted(params: { votingEventId: string; userId: string }) {
    const eventExists = await VotingRecordService.votingEventExists(
      params.votingEventId,
    );

    if (!eventExists) {
      return NextResponse.json({ hasVoted: false });
    }

    const hasVoted = await VotingRecordService.hasUserVotedForEvent(
      params.userId,
      params.votingEventId,
    );

    return NextResponse.json({ hasVoted });
  },

  async getVotingRecordsByVotingEvent(params: { votingEventId: string }) {
    const voteType = await VotingRecordService.getVotingEventVoteType(
      params.votingEventId,
    );
    if (voteType === null) {
      return NextResponse.json([]);
    }
    if (voteType === VoteType.secretBallot) {
      return NextResponse.json(
        {
          error:
            'Per-voter voting records are not available for secret ballot votes',
        },
        { status: 403 },
      );
    }
    const votingRecords =
      await VotingRecordService.getVotingRecordsByVotingEvent(
        params.votingEventId,
      );
    return NextResponse.json(votingRecords);
  },

  async createVotingRecord(request: Request) {
    //Parse the request body as JSON and handle any parsing errors
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate the parsed body against the schema using Zod
    const parsed = createVotingRecordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 },
      );
    }

    const { votingEventId, userId, result, updatedBy } = parsed.data;

    try {
      const newVotingRecord = await VotingRecordService.createVotingRecord({
        votingEventId,
        userId,
        result,
        updatedBy: updatedBy ?? undefined,
      });
      return NextResponse.json(newVotingRecord, { status: 201 });
    } catch (error: any) {
      if (error.message === 'User has already voted for this event') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json(
        { error: error.message || 'Failed to create voting record' },
        { status: 400 },
      );
    }
  },

  async updateVotingRecord(
    request: Request,
    params: { votingRecordId: string },
  ) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as { result?: unknown }).result !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid field: result (string) is required' },
        { status: 400 },
      );
    }

    const { result, updatedBy } = body as {
      result: string;
      updatedBy?: unknown;
    };

    if (
      updatedBy !== undefined &&
      updatedBy !== null &&
      typeof updatedBy !== 'string'
    ) {
      return NextResponse.json(
        { error: 'updatedBy must be a string when provided' },
        { status: 400 },
      );
    }

    const record = await VotingRecordService.getVotingRecordWithEvent(
      params.votingRecordId,
    );

    if (!record || record.deletedAt) {
      return NextResponse.json(
        { error: 'Voting record not found' },
        { status: 404 },
      );
    }

    const event = record.votingEvent;
    if (event.deletedAt) {
      return NextResponse.json(
        { error: 'Cannot edit voting records for a completed voting event' },
        { status: 400 },
      );
    }

    if (event.voteType === VoteType.secretBallot) {
      return NextResponse.json(
        {
          error: 'Voting records cannot be edited for secret ballot events',
        },
        { status: 403 },
      );
    }

    const options = Array.isArray(event.options) ? event.options : [];
    if (!isValidVotingRecordResult(event.voteType, options, result)) {
      return NextResponse.json(
        { error: 'Invalid result for this voting event type' },
        { status: 400 },
      );
    }

    try {
      const updated = await VotingRecordService.updateVotingRecord({
        votingRecordId: params.votingRecordId,
        result,
        ...(typeof updatedBy === 'string' ? { updatedBy } : {}),
      });
      return NextResponse.json(updated);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to update voting record';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  },
};
