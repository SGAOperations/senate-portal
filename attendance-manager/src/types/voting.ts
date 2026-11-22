export interface VotingRecordApiData {
  votingRecordId: string;
  votingEventId: string;
  userId: string;
  result: string;
  user?: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface VotingEventApiData {
  votingEventId: string;
  meetingId: string;
  name: string;
  voteType: string;
  notes?: string | null;
  options: string[];
  createdAt: string;
  updatedAt?: string | null;
  endedAt?: string | null;
  deletedAt?: string | null;
  resultCounts?: Record<string, number>;
  votePassed?: boolean | null;
  secretBallotOutcomeKind?: 'tie' | 'motion_pass_fail' | 'option_winner' | null;
  winningResult?: string | null;
}

export type VotingEventWithRelations = VotingEventApiData & {
  meeting?: {
    name: string;
    date: string;
  };
  votingRecords?: VotingRecordApiData[];
};
