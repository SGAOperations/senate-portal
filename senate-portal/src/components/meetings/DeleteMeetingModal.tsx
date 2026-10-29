import { MeetingApiData } from '@/types';
import { CircleAlert } from 'lucide-react';
import React from 'react';

interface DeleteMeetingModalProps {
  setShowDeleteMeetingModal: (show: boolean) => void;
  handleDeleteMeeting: () => void;
  deleteMeeting: MeetingApiData;
}

const DeleteMeetingModal: React.FC<DeleteMeetingModalProps> = ({
  handleDeleteMeeting,
  setShowDeleteMeetingModal,
  deleteMeeting,
}) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      {/* Delete Confirmation Modal */}
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-white rounded-2xl p-6 w-full max-w-md mx-4'>
          <div className='flex items-center gap-3 mb-4'>
            <CircleAlert />
            <h3 className='text-lg font-semibold text-gray-900'>
              Delete Meeting
            </h3>
          </div>
          <p className='text-gray-700 mb-6'>
            Are you sure you want to delete meeting {deleteMeeting.name}? This
            action cannot be undone.
          </p>
          <div className='flex space-x-4'>
            <button
              onClick={() => setShowDeleteMeetingModal(false)}
              className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium'
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteMeeting}
              className='flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium'
            >
              Delete Meeting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteMeetingModal;
