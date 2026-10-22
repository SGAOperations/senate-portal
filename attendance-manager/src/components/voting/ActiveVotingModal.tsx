import React, { useState } from 'react';
import { X } from 'lucide-react';
import { VotingEventApiData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { yesNoOptions } from '@/utils/consts';

interface ActiveVotingModalProps {
  event: VotingEventApiData;
  onVoted?: () => void;
  onDismiss?: () => void;
}

const ActiveVotingModal: React.FC<ActiveVotingModalProps> = ({
  event,
  onVoted,
  onDismiss,
}) => {
  const { user } = useAuth();
  const [choice, setChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  if (!user || hasVoted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!choice) {
      setError('Please select an option before submitting.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/voting-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          votingEventId: event.votingEventId,
          userId: user.id,
          result: choice,
          updatedBy: user.id,
        }),
      });

      if (!res.ok) {
        setError('Failed to submit vote.');
        return;
      }

      setHasVoted(true);
      onVoted?.();
    } catch {
      setError('Failed to submit vote.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4'>
        <div className='flex items-start justify-between mb-2'>
          <h2 className='text-xl font-semibold text-gray-900'>Active Vote</h2>
          <button
            type='button'
            onClick={onDismiss}
            className='ml-4 inline-flex items-center justify-center rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8102E]'
            aria-label='Dismiss vote'
          >
            <X className='h-4 w-4' />
          </button>
        </div>
        <p className='text-sm text-gray-600 mb-4'>
          {event.name || 'A new voting event is in progress.'}
        </p>
        <p className='text-sm text-gray-600 mb-4'>
          {event.voteType || 'A new voting event is in progress.'}
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <fieldset className='space-y-2'>
            <legend className='text-sm font-medium text-gray-900'>
              Please select your vote:
            </legend>
            {event.voteType === 'ROLL_CALL' ? (
              Object.values(yesNoOptions).map((option) => (
                <label
                  key={option}
                  className='flex items-center space-x-2 text-sm text-gray-800'
                >
                  <input
                    type='radio'
                    name='vote'
                    value={option}
                    checked={choice === option}
                    onChange={() => setChoice(option)}
                    className='h-4 w-4 text-[#C8102E] border-gray-300 focus:ring-[#C8102E]'
                  />
                  <span>{option}</span>
                </label>
              ))
            ) : (
              <div className='space-y-1'>
                {event.options.map((option) => (
                  <label className='flex items-center space-x-2 text-sm text-gray-800'>
                    <input
                      type='radio'
                      name='vote'
                      value={option}
                      checked={choice === option}
                      onChange={() => setChoice(option)}
                      className='h-4 w-4 text-[#C8102E] border-gray-300 focus:ring-[#C8102E]'
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {error && (
            <p className='text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
              {error}
            </p>
          )}

          <div className='flex justify-end pt-2'>
            <button
              type='submit'
              disabled={submitting}
              className='px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A8102E] disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {submitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActiveVotingModal;
