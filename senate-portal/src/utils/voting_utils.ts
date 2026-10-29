import { VotingEventWithRelations } from '@/types';
import { VoteType } from '@/utils/consts';

export function getVoteCounts(
  event: VotingEventWithRelations,
): Record<string, number> {
  if (event.voteType === VoteType.secretBallot) {
    return event.resultCounts ?? {};
  }
  return (event.votingRecords ?? [])
    .filter((r) => !r.deletedAt)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.result] = (acc[r.result] || 0) + 1;
      return acc;
    }, {});
}
