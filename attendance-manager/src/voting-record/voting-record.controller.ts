import { NextResponse } from 'next/server';
import { prisma } from '../lib/prisma';
import { VoteType, yesNoOptions } from '../utils/consts';
import { VotingRecordService } from './voting-record.service';
import { z } from 'zod';

// Define the expected structure of the request body using Zod
// The voter is the signed-in user, never the body. userId and updatedBy are
// still accepted so older clients keep working, but must name the voter.
const createVotingRecordSchema = z.object({
  votingEventId: z.string().min(1),
  userId: z.string().min(1).optional(),
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
  // Secret-ballot records lose their userId: no one, record readers and vote hosts
  // included, may see how a Senator voted in one (XV §2.2.1).
  async getAllVotingRecords() {
    const votingRecords = await VotingRecordService.getAllVotingRecords();
    return NextResponse.json(
      votingRecords.map((record) =>
        record.votingEvent.voteType === VoteType.secretBallot
          ? { ...record, userId: null, updatedBy: null }
          : record,
      ),
    );
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

  /**
   * Casts `voter`'s vote. The route has already checked that they hold a
   * Senate seat (XIV §1.2); here the event must be open and the result one of
   * its options.
   */
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

    const { votingEventId, userId, result, updatedBy } = parsed.data;
    if (
      (userId && userId !== voter.userId) ||
      (updatedBy && updatedBy !== voter.userId)
    ) {
      return NextResponse.json(
        { error: 'You can only cast your own vote' },
        { status: 403 },
      );
    }

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
        { status: 400 },
      );
    }
    const options = Array.isArray(event.options) ? event.options : [];
    if (!isValidVotingRecordResult(event.voteType, options, result)) {
      return NextResponse.json(
        { error: 'Invalid result for this voting event type' },
        { status: 400 },
      );
    }
    // The same rule the voting popup applies: present at the meeting.
    const attendance = await prisma.attendance.findUnique({
      where: {
        // eslint-disable-next-line
        userId_meetingId: { userId: voter.userId, meetingId: event.meetingId },
      },
      select: { status: true },
    });
    if (attendance?.status !== 'PRESENT') {
      return NextResponse.json(
        { error: 'You must be signed in to this meeting to vote' },
        { status: 403 },
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

  /** A vote host's correction; `actorId` is recorded as updatedBy. */
  async updateVotingRecord(
    request: Request,
    params: { votingRecordId: string },
    actorId: string,
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
    if (event.deletedAt || event.endedAt) {
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
        updatedBy: actorId,
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
