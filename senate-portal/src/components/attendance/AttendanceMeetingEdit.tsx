import { UserApiData, AttendanceApiData, MeetingApiData } from '@/types';
import React from 'react';
import { CircleCheck } from 'lucide-react';
import { formatMeetingDate } from '@/meeting/meetingDateTime';

interface AttendanceMeetingSelectProps {
  attendanceUsers: UserApiData[];
  attendanceRecord: Record<string, AttendanceApiData[]>;
  selectedMeeting: MeetingApiData;
  toggleAttendanceStatus: (
    attendanceId: string,

    currentStatus: string,

    userId: string,

    meetingId: string,
  ) => void;
  isLoadingAttendance: boolean;

  setShowEditAttendanceModal: (show: boolean) => void;

  setSelectedMeeting: (meeting: MeetingApiData | null) => void;
}

const AttendanceMeetingEdit: React.FC<AttendanceMeetingSelectProps> = ({
  attendanceUsers,
  attendanceRecord,
  selectedMeeting,
  toggleAttendanceStatus,
  isLoadingAttendance,
  setShowEditAttendanceModal,
  setSelectedMeeting,
}) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Edit Attendance
        </h3>
        <p className='text-sm text-gray-600 mb-4'>
          {selectedMeeting.name} - {formatMeetingDate(selectedMeeting.date)}
        </p>

        {isLoadingAttendance ? (
          <div className='flex justify-center items-center py-8'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#C8102E]'></div>
          </div>
        ) : (
          <>
            <div className='mb-4'>
              <div className='flex justify-between items-center mb-2'>
                <p className='text-sm font-medium text-gray-700'>
                  Select members who attended:
                </p>
                <p className='text-sm text-gray-600'>
                  {attendanceRecord[selectedMeeting.meetingId]?.filter(
                    (record) => record.status === 'PRESENT',
                  ).length ?? 0}
                  {' / '}
                  {attendanceUsers.length} present
                </p>
              </div>
            </div>

            {/* Attendance Checklist */}
            <div className='max-h-96 overflow-y-auto border border-gray-300 rounded-lg'>
              {attendanceUsers.length === 0 ? (
                <p className='text-center py-8 text-gray-500'>
                  No members found
                </p>
              ) : (
                <div className='divide-y divide-gray-200'>
                  {attendanceUsers.map((user) => {
                    const isPresent = attendanceRecord[
                      selectedMeeting.meetingId
                    ]?.some(
                      (record) =>
                        record.userId === user.userId &&
                        record.status === 'PRESENT',
                    );

                    return (
                      <label
                        key={user.userId}
                        className={`flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                          isPresent ? 'bg-green-50' : ''
                        }`}
                      >
                        <input
                          type='checkbox'
                          checked={isPresent}
                          onChange={() => {
                            const hasAttendanceForMeeting =
                              user.attendance.find(
                                (attendance) =>
                                  attendance.meetingId ===
                                  selectedMeeting.meetingId,
                              );

                            if (hasAttendanceForMeeting) {
                              toggleAttendanceStatus(
                                hasAttendanceForMeeting.attendanceId,
                                hasAttendanceForMeeting.status,
                                user.userId,
                                hasAttendanceForMeeting.meetingId,
                              );
                            }
                          }}
                          className='w-5 h-5 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
                        />
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
                          <p className='text-xs text-gray-400'>
                            NUID: {user.nuid}
                          </p>
                        </div>
                        {isPresent && (
                          <div className='flex-shrink-0'>
                            <CircleCheck className='w-6 h-6 text-green-600' />
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className='flex space-x-3 pt-6 border-t border-gray-200 mt-6'>
              <button
                type='button'
                onClick={() => {
                  setShowEditAttendanceModal(false);
                  setSelectedMeeting(null);
                }}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceMeetingEdit;
