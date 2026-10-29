import React from 'react';
import { VotingEventWithRelations } from '@/types';
import { VoteType, getVoteTypeLabel } from '@/utils/consts';
import { getVoteCounts } from '@/utils/voting_utils';
import { Building2, Calendar, ClipboardList } from 'lucide-react';
import VoteBreakdown from './VoteBreakdown';
import { formatMeetingDate } from '@/meeting/meetingDateTime';

interface ActiveVoteCardProps {
  event: VotingEventWithRelations;
  eligible: number;
  onEnd: (votingEventId: string) => void;
  endError: string | null | undefined;
}

const ActiveVoteCard: React.FC<ActiveVoteCardProps> = ({
  event,
  eligible,
  onEnd,
  endError,
}) => {
  const meeting = event.meeting;
  const voteTypeLabel = getVoteTypeLabel(event.voteType as VoteType);
  const voteCounts = getVoteCounts(event);
  const totalVotes = Object.values(voteCounts).reduce((sum, n) => sum + n, 0);

  return (
    <div className='rounded-xl border border-gray-100 bg-gray-50 p-5 text-sm'>
      <div className='flex items-start justify-between gap-2'>
        <div className='font-medium text-gray-900'>{event.name}</div>
        <button
          type='button'
          onClick={() => onEnd(event.votingEventId)}
          className='shrink-0 px-4 py-1 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed'
        >
          Close Vote
        </button>
      </div>

      <div className='flex flex-wrap gap-x-5 gap-y-1.5 mt-2 text-sm text-gray-500'>
        <div className='flex items-center gap-1.5'>
          <ClipboardList className='h-3.5 w-3.5 shrink-0' />
          <span>{voteTypeLabel}</span>
        </div>
        {meeting && (
          <>
            <div className='flex items-center gap-1.5'>
              <Calendar className='h-3.5 w-3.5 shrink-0' />
              <span>{formatMeetingDate(meeting.date)}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <Building2 className='h-3.5 w-3.5 shrink-0' />
              <span>{meeting.name}</span>
            </div>
          </>
        )}
      </div>

      <VoteBreakdown
        event={event}
        eligible={eligible}
        voteCounts={voteCounts}
        totalVotes={totalVotes}
      />

      {endError && (
        <p className='mt-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
          {endError}
        </p>
      )}
    </div>
  );
};

export default ActiveVoteCard;
