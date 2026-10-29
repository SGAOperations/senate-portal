import React, { useState } from 'react';
import { MeetingApiData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveVotingEvent } from '@/hooks/useActiveVotingEvent';
import ActiveVoteCard from './ActiveVoteCard';
import CreateVoteForm from './CreateVoteForm';

interface VotingAdminPanelProps {
  meetings: MeetingApiData[];
  onVotingEventsMutated?: () => void | Promise<void>;
}

const VotingAdminPanel: React.FC<VotingAdminPanelProps> = ({
  meetings,
  onVotingEventsMutated,
}) => {
  const { user } = useAuth();
  const [endErrors, setEndErrors] = useState<Record<string, string | null>>({});

  const {
    activeEvents,
    loading: activeEventLoading,
    refresh: refreshActiveEvent,
  } = useActiveVotingEvent();

  if (!user || user.role !== 'EBOARD') return null;

  const meetingEligibleCount = (meetingId: string) =>
    meetings.find((m) => m.meetingId === meetingId)?.eligibleCount ?? 0;

  const handleEnd = async (votingEventId: string) => {
    setEndErrors((prev) => ({ ...prev, [votingEventId]: null }));
    try {
      const res = await fetch(`/api/voting-event/${votingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ end: true, updatedBy: user.id }),
      });
      if (!res.ok) throw new Error();
      await refreshActiveEvent();
      await onVotingEventsMutated?.();
    } catch {
      setEndErrors((prev) => ({
        ...prev,
        [votingEventId]: 'Failed to end voting event.',
      }));
    }
  };

  return (
    <div className='mt-6 bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-900'>Voting Controls</h2>
        {activeEvents.length > 0 && (
          <span className='inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'>
            <span className='h-1.5 w-1.5 rounded-full bg-green-500' />
            {activeEvents.length === 1
              ? 'Vote In Progress'
              : `${activeEvents.length} Votes In Progress`}
          </span>
        )}
      </div>

      {activeEventLoading && (
        <p className='mb-4 text-sm text-gray-500'>Checking for active votes…</p>
      )}

      {!activeEventLoading && activeEvents.length > 0 && (
        <div className='space-y-2'>
          {activeEvents.map((event) => (
            <ActiveVoteCard
              key={event.votingEventId}
              event={event}
              eligible={meetingEligibleCount(event.meetingId)}
              onEnd={handleEnd}
              endError={endErrors[event.votingEventId]}
            />
          ))}
        </div>
      )}

      {!activeEventLoading && activeEvents.length === 0 && (
        <CreateVoteForm
          meetings={meetings}
          userId={user.id}
          onCreated={refreshActiveEvent}
        />
      )}
    </div>
  );
};

export default VotingAdminPanel;
