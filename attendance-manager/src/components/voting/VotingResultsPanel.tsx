import React, { useState } from 'react';
import { VotingEventWithRelations } from '@/types';
import { getVoteCounts } from '@/utils/voting_utils';
import VotingResultsModal from './VotingResultsModal';
import { formatMeetingDate } from '@/meeting/meetingDateTime';

interface VotingResultsPanelProps {
  events: VotingEventWithRelations[];
  loading: boolean;
  setDeleteEvent: (event: VotingEventWithRelations | null) => void;
}

const formatResultLabel = (result: string) => {
  switch (result) {
    case 'YES':
      return 'Yes';
    case 'NO':
      return 'No';
    case 'ABSTAIN':
      return 'Abstain';
    default:
      return result.charAt(0) + result.slice(1).toLowerCase();
  }
};

const VotingResultsPanel: React.FC<VotingResultsPanelProps> = ({
  events,
  loading,
  setDeleteEvent,
}) => {
  const endedEvents = events
    .filter((e) => !e.deletedAt && !!e.endedAt)
    .sort((a, b) => {
      const aDate = a.endedAt ?? a.deletedAt ?? a.createdAt;
      const bDate = b.endedAt ?? b.deletedAt ?? b.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  const [selectedVote, setSelectedVote] = useState<string>('');
  const [showVotingResultModal, setShowVotingResultsModal] =
    useState<boolean>(false);
  return (
    <div className='mt-8 bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-900'>
          Past Voting Results
        </h2>
      </div>

      {loading ? (
        <p className='text-sm text-gray-500'>Loading vote results…</p>
      ) : endedEvents.length === 0 ? (
        <p className='text-sm text-gray-500'>No completed voting events yet.</p>
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
              </tr>
            </thead>
            <tbody>
              {endedEvents.map((event) => {
                const counts = getVoteCounts(event);
                const totalVotes = Object.values(counts).reduce(
                  (sum, n) => sum + n,
                  0,
                );

                return (
                  <tr
                    key={event.votingEventId}
                    className='border-b border-gray-100 hover:bg-gray-50'
                    onClick={() => {
                      if (event.voteType !== 'SECRET_BALLOT') {
                        setShowVotingResultsModal(true);
                        setSelectedVote(event.votingEventId);
                      }
                    }}
                  >
                    <td className='py-2 px-3 align-top'>
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
                          {Object.entries(counts).map(([key, value]) => (
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
                          {event.voteType === 'SECRET_BALLOT' &&
                            event.secretBallotOutcomeKind === 'tie' && (
                              <span className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800'>
                                Tie
                              </span>
                            )}
                          {event.voteType === 'SECRET_BALLOT' &&
                            event.secretBallotOutcomeKind ===
                              'motion_pass_fail' &&
                            event.votePassed !== null &&
                            event.votePassed !== undefined && (
                              <span
                                className={
                                  event.votePassed
                                    ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800'
                                    : 'inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-800'
                                }
                              >
                                {event.votePassed ? 'Passed' : 'Failed'}
                              </span>
                            )}
                          {event.voteType === 'SECRET_BALLOT' &&
                            event.secretBallotOutcomeKind === 'option_winner' &&
                            event.winningResult != null &&
                            event.winningResult !== '' && (
                              <span className='inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800'>
                                {formatResultLabel(event.winningResult)} won
                              </span>
                            )}
                        </div>
                      )}
                      {/* Delete button for past events */}
                      <div className='ml-1'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteEvent(event);
                          }}
                          className='text-red-400 hover:text-red-600 text-xs font-medium'
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showVotingResultModal && (
        <VotingResultsModal
          selectedVote={selectedVote}
          setShowVotingResultsModal={setShowVotingResultsModal}
          setSelectedVoting={setSelectedVote}
        />
      )}
    </div>
  );
};

export default VotingResultsPanel;
