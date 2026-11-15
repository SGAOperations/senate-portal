import { prisma } from '@/server/db/prisma';
import { VoteType } from '@/lib/constants';

export const VotingRecordService = {
  // Secret ballot records are left out: who voted what stays secret.
  async getAllVotingRecords() {
    return await prisma.votingRecord.findMany({
      where: { votingEvent: { voteType: { not: VoteType.secretBallot } } },
      include: {
        votingEvent: {
          include: {
            meeting: true,
          },
        },
      },
    });
  },

  async getVotingRecordsByVotingEvent(votingEventId: string) {
    return await prisma.votingRecord.findMany({
      where: { votingEventId },
      include: {
        votingEvent: {
          include: {
            meeting: true,
          },
        },
      },
    });
  },

  async hasUserVotedForEvent(userId: string, votingEventId: string) {
    const existing = await prisma.votingRecord.findFirst({
      where: { userId, votingEventId },
    });
    return existing !== null;
  },

  async createVotingRecord(data: {
    votingEventId: string;
    userId: string;
    result: string;
    updatedBy?: string;
  }) {
    const alreadyVoted = await this.hasUserVotedForEvent(
      data.userId,
      data.votingEventId,
    );
    if (alreadyVoted) {
      throw new Error('User has already voted for this event');
    }

    return await prisma.votingRecord.create({
      data: {
        votingEventId: data.votingEventId,
        userId: data.userId,
        result: data.result,
        updatedBy: data.updatedBy,
      },
      include: {
        votingEvent: {
          include: {
            meeting: true,
          },
        },
      },
    });
  },
  async updateVotingRecord(data: {
    votingRecordId: string;
    result: string;
    updatedBy?: string;
  }) {
    return prisma.votingRecord.update({
      where: { votingRecordId: data.votingRecordId },
      data: {
        result: data.result,
        ...(data.updatedBy !== undefined ? { updatedBy: data.updatedBy } : {}),
      },
      include: {
        votingEvent: {
          include: {
            meeting: true,
          },
        },
      },
    });
  },

  async deleteVotingRecord(votingRecordId: string) {
    return prisma.votingRecord.delete({
      where: { votingRecordId },
    });
  },
};
