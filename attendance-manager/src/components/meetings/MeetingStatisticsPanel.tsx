import { CircleCheck, Clock, X } from 'lucide-react';

import React from 'react';

interface MeetingStatisticsPanelProps {
  attendedMeetings: number | null;
  missedMeetings: number | null;
  upcomingMeetings: number;
  isSemesterLoading: boolean;
  semesterLabel: string | null;
  isAdmin: boolean;

  setShowCreateMeetingModal: (show: boolean) => void;
}

const MeetingStatisticsPanel: React.FC<MeetingStatisticsPanelProps> = ({
  attendedMeetings,
  missedMeetings,
  upcomingMeetings,
  isSemesterLoading,
  semesterLabel,
  isAdmin,
  setShowCreateMeetingModal,
}) => {
  const semesterStat = (value: number | null) =>
    isSemesterLoading ? '…' : (value ?? '—');

  return (
    <div className='lg:col-span-1'>
      <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
        <h2 className='text-lg font-semibold text-gray-900'>
          Meeting Statistics
        </h2>
        <p className='text-sm text-gray-500 mb-6'>
          {isSemesterLoading
            ? 'Loading semester…'
            : (semesterLabel ?? 'No current semester')}
        </p>

        <div className='space-y-6'>
          {/* Attended Meetings */}
          <div className='text-center'>
            <div className='flex justify-center mb-2'>
              <CircleCheck className='w-8 h-8 text-[#A4804A]' />
            </div>
            <h3 className='text-sm font-medium text-gray-900 mb-1'>
              Attended Meetings
            </h3>
            <p className='text-2xl font-bold text-[#C8102E]'>
              {semesterStat(attendedMeetings)}
            </p>
          </div>

          {/* Missed Meetings */}
          <div className='text-center'>
            <div className='flex justify-center mb-2'>
              <X className='w-8 h-8 text-[#A4804A]' />
            </div>
            <h3 className='text-sm font-medium text-gray-900 mb-1'>
              Missed Meetings
            </h3>
            <p className='text-2xl font-bold text-[#C8102E]'>
              {semesterStat(missedMeetings)}
            </p>
          </div>

          {/* Upcoming Meetings */}
          <div className='text-center'>
            <div className='flex justify-center mb-2'>
              <Clock className='w-8 h-8 text-[#A4804A]' />
            </div>
            <h3 className='text-sm font-medium text-gray-900 mb-1'>
              Upcoming Meetings
            </h3>
            <p className='text-2xl font-bold text-[#C8102E]'>
              {upcomingMeetings}
            </p>
          </div>
        </div>
      </div>

      {/* Create Meeting Button - Only for Admins */}
      {isAdmin && (
        <div className='mt-6 space-y-3'>
          <button
            onClick={() => setShowCreateMeetingModal(true)}
            className='w-full px-4 py-3 bg-[#C8102E] text-white rounded-xl hover:bg-[#A8102E] transition-colors font-medium shadow-lg hover:shadow-xl'
          >
            + Create New Meeting
          </button>
        </div>
      )}
    </div>
  );
};

export default MeetingStatisticsPanel;
