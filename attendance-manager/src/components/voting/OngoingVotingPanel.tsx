'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VoteType } from '@/utils/consts';
import { getVoteCounts } from '@/utils/voting_utils';
import { useActiveVotingEvents } from '@/hooks/useActiveVotingEvents';
import { formatResultLabel } from './votingDisplayUtils';
import { formatMeetingDate } from '@/meeting/meetingDateTime';
import EditVotingRecordsModal from './EditVotingRecordsModal';

interface OngoingVotingPanelProps {
  refreshTrigger?: number;
}

const OngoingVotingPanel: React.FC<OngoingVotingPanelProps> = ({
  refreshTrigger = 0,
}) => {
  const { user } = useAuth();
  const {
    events: ongoingEvents,
    loading,
    error,
    refresh,
  } = useActiveVotingEvents();
  const [editEventId, setEditEventId] = useState<string | null>(null);

  useEffect(() => {
    if (refreshTrigger === 0) return;
    void refresh();
  }, [refreshTrigger, refresh]);

  if (!user || user.role !== 'EBOARD') {
    return null;
  }

  return (
    <div className='mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-900'>Ongoing Voting</h2>
      </div>

      {error && (
        <p className='mb-3 text-sm text-red-600' role='alert'>
          {error}
        </p>
      )}

      {loading ? (
        <p className='text-sm text-gray-500'>Loading ongoing votes…</p>
      ) : ongoingEvents.length === 0 ? (
        <p className='text-sm text-gray-500'>No voting events in progress.</p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200'>
                <th className='text-left py-3 px-4 font-medium text-gray-900'>
                  Meeting / Date
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-900'>
                  Question
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-900'>
                  Vote Type
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-900'>
                  Results
                </th>
                <th className='text-left py-3 px-4 font-medium text-gray-900'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {ongoingEvents.map((event) => {
                const voteCounts = getVoteCounts(event);
                const totalVotes = Object.values(voteCounts).reduce(
                  (sum, n) => sum + n,
                  0,
                );
                const isSecret = event.voteType === VoteType.secretBallot;

                return (
                  <tr
                    key={event.votingEventId}
                    className='border-b border-gray-100 hover:bg-gray-50'
                  >
                    <td className='py-3 px-4 align-top'>
                      <div className='text-gray-900 font-medium'>
                        {event.meeting?.name ?? 'Unknown meeting'}
                      </div>
                      <div className='text-xs text-gray-500'>
                        {event.meeting?.date
                          ? formatMeetingDate(event.meeting.date)
                          : new Date(event.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className='py-3 px-4 align-top'>
                      <div className='text-gray-900'>
                        {event.name || 'Untitled vote'}
                      </div>
                    </td>
                    <td className='py-3 px-4 align-top'>
                      <span className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'>
                        {event.voteType}
                      </span>
                    </td>
                    <td className='py-3 px-4 align-top'>
                      {totalVotes === 0 ? (
                        <span className='text-xs text-gray-500'>
                          No votes recorded
                        </span>
                      ) : (
                        <div className='flex flex-wrap gap-2 items-center'>
                          {Object.entries(voteCounts).map(([key, value]) => (
                            <span
                              key={key}
                              className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'
                            >
                              {formatResultLabel(key)}: {value}
                            </span>
                          ))}
                          <span className='inline-flex items-center rounded-full bg-gray-50 px-2 py-1 text-xs text-gray-500'>
                            Total: {totalVotes}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className='py-3 px-4 align-top'>
                      {isSecret ? (
                        <span
                          className='text-xs text-gray-500'
                          title='Per-voter records are not editable for secret ballot'
                        >
                          —
                        </span>
                      ) : (
                        <button
                          type='button'
                          onClick={() => setEditEventId(event.votingEventId)}
                          className='rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A8102E]'
                        >
                          Edit Voting Records
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editEventId && (
        <EditVotingRecordsModal
          votingEventId={editEventId}
          onClose={() => setEditEventId(null)}
          onSaved={() => {
            void refresh();
          }}
        />
      )}
    </div>
  );
};

export default OngoingVotingPanel;
