import React from 'react';
import {
  formatMeetingDate,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';

interface ViewMeetingModalProps {
  meeting: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    type: 'FULL_BODY' | 'REGULAR';
  };

  setShowViewMeetingModal: (show: boolean) => void;
}

const ViewMeetingModal: React.FC<ViewMeetingModalProps> = ({
  meeting,
  setShowViewMeetingModal,
}) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-xl font-semibold text-gray-900 mb-6'>
          Meeting Details
        </h3>

        <div className='space-y-6'>
          {/* Meeting Name */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Meeting Name
            </label>
            <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900'>
              {meeting.name}
            </p>
          </div>

          {/* Date and Time */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Date
              </label>
              <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900'>
                {formatMeetingDate(meeting.date)}
              </p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Start Time
              </label>
              <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900'>
                {formatMeetingTime(meeting.startTime)}
              </p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                End Time
              </label>
              <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900'>
                {formatMeetingTime(meeting.endTime)}
              </p>
            </div>
          </div>

          {/* Meeting Type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Meeting Type
            </label>
            <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900'>
              {meeting.type === 'FULL_BODY' ? 'Full Body' : 'Regular'}
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Notes
            </label>
            <p className='w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 whitespace-pre-wrap'>
              {meeting.notes}
            </p>
          </div>

          {/* Close Button */}
          <div className='pt-6 border-t border-gray-200'>
            <button
              type='button'
              onClick={() => setShowViewMeetingModal(false)}
              className='w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMeetingModal;
