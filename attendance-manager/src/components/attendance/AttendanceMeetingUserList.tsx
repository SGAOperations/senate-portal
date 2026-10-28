import { MeetingApiData, UserApiData, AttendanceApiData } from '@/types';
import { CircleCheck } from 'lucide-react';
import React from 'react';
import {
  formatMeetingDate,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';

interface AttendanceMeetingUserListProps {
  selectedMeetingForCheck: MeetingApiData;
  isLoadingAttendance: boolean;
  attendanceUsers: UserApiData[];
  attendanceRecord: Record<string, AttendanceApiData[]>;
  setAttendanceCheckStep: (
    step: 'select-meeting' | 'user-list' | 'check-in',
  ) => void;
  handleStartCheckIn: () => void;
}

const AttendanceMeetingUserList: React.FC<AttendanceMeetingUserListProps> = ({
  selectedMeetingForCheck,
  isLoadingAttendance,
  attendanceUsers,
  attendanceRecord,
  setAttendanceCheckStep,
  handleStartCheckIn,
}) => {
  return (
    <>
      <div className='mb-6'>
        <h3 className='text-xl font-semibold text-gray-900 mb-1'>
          {selectedMeetingForCheck.name}
        </h3>
        <p className='text-sm text-gray-600'>
          {formatMeetingDate(selectedMeetingForCheck.date)} •{' '}
          {formatMeetingTime(selectedMeetingForCheck.startTime)} -{' '}
          {formatMeetingTime(selectedMeetingForCheck.endTime)}
        </p>
      </div>

      {isLoadingAttendance ? (
        <div className='flex justify-center items-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8102E]'></div>
        </div>
      ) : (
        <>
          <div className='mb-4'>
            <div className='flex justify-between items-center'>
              <p className='text-sm font-medium text-gray-700'>
                Members Expected
              </p>
              <p className='text-sm text-gray-600'></p>
            </div>
          </div>

          {/* User List */}
          <div className='max-h-64 overflow-y-auto border border-gray-300 rounded-lg mb-6'>
            {attendanceUsers.length === 0 ? (
              <p className='text-center py-8 text-gray-500'>No members found</p>
            ) : (
              <div className='divide-y divide-gray-200'>
                {[...attendanceUsers]
                  .sort((a, b) => a.lastName.localeCompare(b.firstName))
                  .map((user) => {
                    const isPresent = attendanceRecord[
                      selectedMeetingForCheck.meetingId
                    ]?.some(
                      (record) =>
                        record.userId === user.userId &&
                        record.status === 'PRESENT',
                    );
                    return (
                      <div
                        key={user.userId}
                        className={`flex items-center space-x-3 p-3 ${
                          isPresent ? 'bg-green-50' : 'bg-white'
                        }`}
                      >
                        <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center flex-shrink-0'>
                          <span className='text-white text-sm font-semibold'>
                            {user.firstName.charAt(0)}
                          </span>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900'>
                            {user.firstName} {user.lastName}
                          </p>
                          <p className='text-xs text-gray-500 truncate'>
                            {user.email}
                          </p>
                        </div>
                        {isPresent && (
                          <div className='flex-shrink-0'>
                            <CircleCheck className='w-6 h-6 text-green-600' />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className='flex space-x-3'>
            <button
              type='button'
              onClick={() => setAttendanceCheckStep('select-meeting')}
              className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
            >
              Back
            </button>
            <button
              type='button'
              onClick={handleStartCheckIn}
              className='flex-1 px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A8102E]'
            >
              Start Check-In
            </button>
          </div>
        </>
      )}
    </>
  );
};

export default AttendanceMeetingUserList;
