import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/prisma';
import { VoteType, yesNoOptions } from '@/lib/constants';
import { VotingRecordService } from './voting-record.service';
import { z } from 'zod';

// Define the expected structure of the request body using Zod. The voter comes
// from the session (the route passes it in), so a userId or updatedBy in the
// body is dropped rather than trusted.
const createVotingRecordSchema = z.object({
  votingEventId: z.string().min(1),
  result: z.string().min(1),
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
    const votingEvent = await prisma.votingEvent.findUnique({
      where: { votingEventId: params.votingEventId },
      select: { votingEventId: true },
    });

    if (!votingEvent) {
      return NextResponse.json({ hasVoted: false });
    }

    const record = await prisma.votingRecord.findFirst({
      where: {
        votingEventId: params.votingEventId,
        userId: params.userId,
      },
      select: { userId: true },
    });

    return NextResponse.json({
      hasVoted: !!record,
    });
  },

  async getVotingRecordsByVotingEvent(params: { votingEventId: string }) {
    const votingEvent = await prisma.votingEvent.findUnique({
      where: { votingEventId: params.votingEventId },
      select: { voteType: true },
    });
    if (!votingEvent) {
      return NextResponse.json([]);
    }
    if (votingEvent.voteType === VoteType.secretBallot) {
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

  async createVotingRecord(request: Request, voter: { userId: string }) {
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

    const { votingEventId, result } = parsed.data;

    const event = await prisma.votingEvent.findUnique({
      where: { votingEventId },
      include: { meeting: { select: { deletedAt: true } } },
    });
    if (!event || event.deletedAt || event.meeting.deletedAt) {
      return NextResponse.json(
        { error: 'Voting event not found' },
        { status: 404 },
      );
    }
    if (event.endedAt) {
      return NextResponse.json(
        { error: 'This vote has ended' },
        { status: 409 },
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
      const newVotingRecord = await VotingRecordService.createVotingRecord({
        votingEventId,
        userId: voter.userId,
        result,
        updatedBy: voter.userId,
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
    editor: { updatedBy: string },
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

    // updatedBy is the signed-in host (passed in by the route), never the body
    const { result } = body as { result: string };

    const record = await prisma.votingRecord.findUnique({
      where: { votingRecordId: params.votingRecordId },
      include: {
        votingEvent: true,
      },
    });

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
        updatedBy: editor.updatedBy,
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
