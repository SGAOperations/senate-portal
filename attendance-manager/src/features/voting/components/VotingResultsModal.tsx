import { VotingRecordApiData, VotingEventApiData } from '@/types';
import { useEffect, useState } from 'react';
import React from 'react';

interface VotingResultsModalProps {
  selectedVote: string;
  setShowVotingResultsModal: (show: boolean) => void;
  setSelectedVoting: (voteId: string) => void;
}

const VotingResultsModal: React.FC<VotingResultsModalProps> = ({
  selectedVote,
  setShowVotingResultsModal,
  setSelectedVoting,
}) => {
  const [results, setResults] = useState<VotingRecordApiData[]>([]);
  const [vote, setVote] = useState<VotingEventApiData>();
  useEffect(() => {
    const loadResult = async () => {
      try {
        const response = await fetch(`/api/voting-event/${selectedVote}`);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch vote (${response.status}): ${errorText}`,
          );
        }
        const data = await response.json();
        setResults(data.votingRecords);
        setVote(data);
      } catch {
        // Skip
      }
    };

    loadResult();
  }, [selectedVote]);
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Voting Result
        </h3>
        <p className='text-sm text-gray-600 mb-4'>{vote?.name}</p>

        <>
          {/* List of voting results */}
          {results && (
            <div className='max-h-96 overflow-y-auto border border-gray-300 rounded-lg'>
              <div className='divide-y divide-gray-200'>
                {results.map((result) => {
                  return (
                    <label
                      key={result.userId}
                      className={
                        'flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors'
                      }
                    >
                      <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-sm font-semibold'>
                          {result?.user?.firstName?.charAt(0) ?? ''}
                        </span>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium text-gray-900'>
                          {result?.user?.firstName} {result?.user?.lastName}
                        </p>
                      </div>
                      {result.result}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className='flex pt-6 border-t border-gray-200 mt-6'>
            <button
              type='button'
              onClick={() => {
                setShowVotingResultsModal(false);
                setSelectedVoting('');
              }}
              className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
            >
              Close
            </button>
          </div>
        </>
      </div>
    </div>
  );
};

export default VotingResultsModal;
