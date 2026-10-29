import { prisma } from '../lib/prisma';
import { VoteType } from '../utils/consts';

const secretBallot = VoteType.secretBallot;

export function computeVotePassedFromCounts(
  counts: Record<string, number>,
  options: string[],
): boolean | null {
  const yes = (counts['YES'] ?? 0) + (counts['Yes'] ?? 0);
  const no = (counts['NO'] ?? 0) + (counts['No'] ?? 0);
  if (yes > 0 || no > 0) {
    return yes > no;
  }

  if (options.length >= 2) {
    const a = options[0];
    const b = options[1];
    const ca = counts[a] ?? 0;
    const cb = counts[b] ?? 0;
    if (ca + cb > 0) {
      return ca > cb;
    }
  }

  return null;
}

// Yes, No, or Abstain
// eslint-disable-next-line
const YES_NO_ABSTAIN_RESULT_KEYS = new Set([
  'YES',
  'NO',
  'Yes',
  'No',
  'ABSTAIN',
  'Abstain',
]);

export type SecretBallotOutcomeKind =
  | 'tie'
  | 'motion_pass_fail'
  | 'option_winner'
  | null;

// Choose what shows up for secret ballot: Passed/Failed, who won, or Tie
export function deriveSecretBallotOutcome(
  resultCounts: Record<string, number>,
  options: string[],
): {
  outcomeKind: SecretBallotOutcomeKind;
  winningResult: string | null;
  votePassed: boolean | null;
} {
  const votePassed = computeVotePassedFromCounts(resultCounts, options);
  const total = Object.values(resultCounts).reduce((s, n) => s + n, 0);
  if (total === 0) {
    return { outcomeKind: null, winningResult: null, votePassed: null };
  }

  const entries = Object.entries(resultCounts).filter(([, n]) => n > 0);
  const max = Math.max(...entries.map(([, n]) => n));
  const tops = entries.filter(([, n]) => n === max).map(([k]) => k);

  if (tops.length > 1) {
    return { outcomeKind: 'tie', winningResult: null, votePassed };
  }
  const winner = tops[0]!;

  const isYesNoAbstainOnly =
    entries.length > 0 &&
    entries.every(([k]) => YES_NO_ABSTAIN_RESULT_KEYS.has(k));
  const yes = (resultCounts['YES'] ?? 0) + (resultCounts['Yes'] ?? 0);
  const no = (resultCounts['NO'] ?? 0) + (resultCounts['No'] ?? 0);
  const hasYesNoVotes = yes > 0 || no > 0;

  if (isYesNoAbstainOnly && hasYesNoVotes && votePassed !== null) {
    return { outcomeKind: 'motion_pass_fail', winningResult: null, votePassed };
  }

  return { outcomeKind: 'option_winner', winningResult: winner, votePassed };
}

function buildResultCountsFromRecords(records: any[]): Record<string, number> {
  const resultCounts: Record<string, number> = {};
  for (const r of records) {
    if (r?.deletedAt) continue;
    const key = r?.result;
    if (typeof key !== 'string') continue;
    resultCounts[key] = (resultCounts[key] ?? 0) + 1;
  }
  return resultCounts;
}

// Secret ballot: aggregates + outcome labels
function redactSecretBallotForResults<
  T extends {
    voteType: string;
    votingRecords?: any[];
    options?: string[];
    resultCounts?: Record<string, number>;
    secretBallotOutcomeKind?: SecretBallotOutcomeKind;
  },
>(event: T): T {
  if (event.voteType !== secretBallot) return event;

  const records = event.votingRecords || [];
  const hasRecords = records.some((r: any) => r && !r.deletedAt);
  if (!hasRecords && event.resultCounts && 'secretBallotOutcomeKind' in event) {
    return event;
  }

  const resultCounts = hasRecords
    ? buildResultCountsFromRecords(records)
    : (event.resultCounts ?? {});
  const options = Array.isArray(event.options) ? event.options : [];
  const derived = deriveSecretBallotOutcome(resultCounts, options);

  // eslint-disable-next-line
  const { votingRecords: _omit, ...rest } = event as any;
  return {
    ...rest,
    resultCounts,
    votePassed: derived.votePassed,
    secretBallotOutcomeKind: derived.outcomeKind,
    winningResult: derived.winningResult,
  } as T;
}

export function formatVotingEventForApi<
  T extends { voteType: string; votingRecords?: any[] },
>(event: T | null): T | null {
  if (!event) return event;
  return redactSecretBallotForResults(event as T);
}

async function attachVoterNamesToVotingEvent<
  T extends { voteType: string; votingRecords?: any[] },
>(event: T | null): Promise<T | null> {
  if (!event) return event;
  if (event.voteType === secretBallot) return event;
  if (!event.votingRecords || event.votingRecords.length === 0) return event;

  const userIds = Array.from(
    new Set(
      event.votingRecords
        .map((r: any) => r?.userId)
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.length > 0,
        ),
    ),
  );

  if (userIds.length === 0) return event;

  const users = await prisma.user.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, firstName: true, lastName: true },
  });

  const userById = new Map(users.map((u) => [u.userId, u]));

  return {
    ...event,
    votingRecords: event.votingRecords.map((record: any) => {
      const user =
        typeof record?.userId === 'string'
          ? userById.get(record.userId)
          : undefined;
      return {
        ...record,
        user: user
          ? { firstName: user.firstName, lastName: user.lastName }
          : null,
      };
    }),
  };
}

export const VotingService = {
  async getActiveVotingEvents() {
    const events = await prisma.votingEvent.findMany({
      where: { deletedAt: null, endedAt: null },
      include: { meeting: true, votingRecords: true },
    });
    return events.map((e) => formatVotingEventForApi(e)!);
  },

  async getAllVotingEvents({ isEboard }: { isEboard: boolean }) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const events = await prisma.votingEvent.findMany({
      where: isEboard ? undefined : { endedAt: { lte: oneHourAgo } },
      include: {
        meeting: true,
        votingRecords: true,
      },
    });
    const withNames = await Promise.all(
      events.map((e) => attachVoterNamesToVotingEvent(e)),
    );
    return withNames.map((e) => formatVotingEventForApi(e)!);
  },

  getVotingEventById: async (votingEventId: string) => {
    const event = await prisma.votingEvent.findUnique({
      where: { votingEventId },
      include: {
        meeting: true,
        votingRecords: true,
      },
    });

    if (!event) return null;

    // For ROLL_CALL: attach user names
    const withUsers = await attachVoterNamesToVotingEvent(event);

    // Always format for API: aggregates for secretBallot, etc.
    return formatVotingEventForApi(withUsers);
  },

  async getVotingEventsByVoteType(voteType: string) {
    const events = await prisma.votingEvent.findMany({
      where: { voteType },
      include: { meeting: true, votingRecords: true },
    });

    const eventsWithUsers = await Promise.all(
      events.map((e) => attachVoterNamesToVotingEvent(e)),
    );

    return eventsWithUsers.map((e) => formatVotingEventForApi(e)!);
  },

  async createVotingEvent(data: {
    meetingId: string;
    name: string;
    voteType: string;
    notes?: string;
    options?: string[];
    updatedBy?: string;
  }) {
    return await prisma.votingEvent.create({
      data: {
        meetingId: data.meetingId,
        name: data.name,
        voteType: data.voteType,
        notes: data.notes,
        options: data.options,
        updatedBy: data.updatedBy,
      },
      include: {
        meeting: true,
        votingRecords: true,
      },
    });
  },

  async updateVotingEvent(
    votingEventId: string,
    updates: Partial<{
      meetingId: string;
      name: string;
      voteType: string;
      notes: string | null;
      options: string[];
      updatedBy: string;
      deletedAt: Date | null;
    }>,
  ) {
    return await prisma.votingEvent.update({
      where: { votingEventId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        meeting: true,
        votingRecords: true,
      },
    });
  },

  // Add deletedAt time
  async deleteVotingEvent(votingEventId: string) {
    return prisma.votingEvent.update({
      where: { votingEventId },
      data: { deletedAt: new Date() },
    });
  },

  // Add endedAt time
  async endVotingEvent(votingEventId: string, updatedBy?: string) {
    const event = await prisma.votingEvent.update({
      where: { votingEventId },
      data: { endedAt: new Date(), updatedBy },
      include: {
        meeting: true,
        votingRecords: true,
      },
    });

    const withUsers = await attachVoterNamesToVotingEvent(event);
    return formatVotingEventForApi(withUsers);
  },
};
