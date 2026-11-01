import { NextResponse } from 'next/server';
import { z } from 'zod';
import { VotingService, formatVotingEventForApi } from './voting.service';
import { VoteType } from '@/utils/consts';
import { requireAuth } from '@/utils/api-auth';

const createVotingEventSchema = z.object({
  meetingId: z.string().min(1),
  name: z.string().min(1),
  voteType: z.enum(VoteType),
  notes: z.string().nullish(),
  options: z.array(z.string()).optional(),
  updatedBy: z.string().optional(),
});
const updateVotingEventSchema = createVotingEventSchema
  .partial()
  .extend({
    deletedAt: z.coerce.date().nullish(),
    end: z.boolean().optional(),
  })
  .refine((updates) => Object.keys(updates).length > 0, {
    error: 'No valid fields to update',
  });
const REQUIRED_SECRET_BALLOT_OPTIONS = ['No Confidence', 'Abstain'] as const;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0
        ? `${issue.path.join('.')}: ${issue.message}`
        : issue.message,
    )
    .join('; ');
}

function normalizeCreateOptionsForSecretBallot(
  voteType: string,
  options: string[] | undefined,
): string[] | undefined {
  if (voteType !== VoteType.secretBallot) return options;
  const merged = [...(options ?? [])];
  for (const required of REQUIRED_SECRET_BALLOT_OPTIONS) {
    if (!merged.includes(required)) {
      merged.push(required);
    }
  }
  return merged;
}

export const VotingController = {
  async getActiveVotingEvents() {
    const votingEvents = await VotingService.getActiveVotingEvents();
    return NextResponse.json(votingEvents);
  },

  async getAllVotingEvents() {
    const { user, error } = await requireAuth();
    if (error) return error;
    const isEboard = user!.role.roleType === 'EBOARD';
    const votingEvents = await VotingService.getAllVotingEvents({ isEboard });
    return NextResponse.json(votingEvents);
  },

  async getVotingEvent(params: { votingEventId: string }) {
    const votingEvent = await VotingService.getVotingEventById(
      params.votingEventId,
    );
    if (!votingEvent) {
      return NextResponse.json(
        { error: 'Voting event not found' },
        { status: 404 },
      );
    }
    return NextResponse.json(votingEvent);
  },

  async getVotingEventsByVoteType(params: { voteType: string }) {
    const votingEvents = await VotingService.getVotingEventsByVoteType(
      params.voteType,
    );
    return NextResponse.json(votingEvents);
  },

  async createVotingEvent(request: Request) {
    const parsed = createVotingEventSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const body = parsed.data;

    try {
      const newVotingEvent = await VotingService.createVotingEvent({
        meetingId: body.meetingId,
        name: body.name,
        voteType: body.voteType,
        notes: body.notes ?? undefined,
        options: normalizeCreateOptionsForSecretBallot(
          body.voteType,
          body.options,
        ),
        updatedBy: body.updatedBy,
      });
      return NextResponse.json(formatVotingEventForApi(newVotingEvent), {
        status: 201,
      });
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to create voting event' },
        { status: 400 },
      );
    }
  },

  async updateVotingEvent(request: Request, params: { votingEventId: string }) {
    const parsed = updateVotingEventSchema.safeParse(
    await request.json().catch(() => null),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }
    const { end, ...updates } = parsed.data;

    // End voting event
    try {
      if (end === true) {
        const ended = await VotingService.endVotingEvent(
          params.votingEventId,
          updates.updatedBy,
        );
        return NextResponse.json(ended);
      }

      const updatedVotingEvent = await VotingService.updateVotingEvent(
        params.votingEventId,
        updates,
      );
      return NextResponse.json(formatVotingEventForApi(updatedVotingEvent));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Voting event not found' },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to update voting event' },
        { status: 400 },
      );
    }
  },
};
