import React from 'react';
import { CircleAlert } from 'lucide-react';
import { VotingEventApiData, VotingRecordApiData } from '@/types';

type VotingEventWithRelations = VotingEventApiData & {
  meeting?: {
    name: string;
    date: string;
  };
  votingRecords?: VotingRecordApiData[];
};

interface DeleteVotingModalProps {
  deleteEvent: VotingEventWithRelations;
  onDeleteEvent: (votingEventId: string) => void;
  setDeleteEvent: (ev: VotingEventWithRelations | null) => void;
  deleteLoading?: boolean;
}

const DeleteVotingModal: React.FC<DeleteVotingModalProps> = ({
  deleteEvent,
  onDeleteEvent,
  setDeleteEvent,
  deleteLoading = false,
}) => {
  const displayName =
    deleteEvent.meeting?.name ?? deleteEvent.name ?? 'this vote';

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-4'>
          <CircleAlert />
          <h3 className='text-lg font-semibold text-gray-900'>Delete</h3>
        </div>

        {/* Message */}
        <p className='text-gray-600 mb-6 leading-relaxed'>
          Are you sure you want to delete{' '}
          <span className='font-semibold text-gray-900'>{displayName}</span>?
          This action cannot be undone.
        </p>

        {/* Actions */}
        <div className='flex gap-3'>
          <button
            type='button'
            onClick={() => setDeleteEvent(null)}
            className='flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition'
          >
            Cancel
          </button>

          <button
            type='button'
            onClick={() => {
              onDeleteEvent(deleteEvent.votingEventId);
              setDeleteEvent(null);
            }}
            disabled={deleteLoading}
            className='flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60'
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteVotingModal;
