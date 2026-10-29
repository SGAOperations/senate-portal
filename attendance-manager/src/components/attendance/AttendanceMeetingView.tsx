import { AttendanceApiData, MeetingApiData } from '@/types';
import React from 'react';
import { formatMeetingDate } from '@/meeting/meetingDateTime';

interface AttendanceMeetingViewProps {
  meeting: MeetingApiData;
  attendance: AttendanceApiData[];
  onClose: () => void;
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'PRESENT':
      return { label: 'Present', className: 'bg-green-100 text-green-800' };
    case 'EXCUSED_ABSENCE':
      return {
        label: 'Excused Absence',
        className: 'bg-yellow-100 text-yellow-800',
      };
    case 'UNEXCUSED_ABSENCE':
      return {
        label: 'Unexcused Absence',
        className: 'bg-red-100 text-red-800',
      };
    case 'PENDING':
      return { label: 'Pending', className: 'bg-gray-100 text-gray-800' };
    default:
      return { label: status, className: 'bg-gray-100 text-gray-800' };
  }
}

// Read-only list of who attended a meeting. Nothing here changes attendance;
// use the Edit modal for that.
const AttendanceMeetingView: React.FC<AttendanceMeetingViewProps> = ({
  meeting,
  attendance,
  onClose,
}) => {
  const presentCount = attendance.filter(
    (record) => record.status === 'PRESENT',
  ).length;

  // sorted by last name so it's easy to match against a spreadsheet
  const sortedAttendance = [...attendance].sort((a, b) =>
    `${a.user?.lastName} ${a.user?.firstName}`.localeCompare(
      `${b.user?.lastName} ${b.user?.firstName}`,
    ),
  );

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          View Attendance
        </h3>
        <p className='text-sm text-gray-600 mb-4'>
          {meeting.name} - {formatMeetingDate(meeting.date)}
        </p>

        <div className='flex justify-end mb-2'>
          <p className='text-sm text-gray-600'>
            {presentCount} / {attendance.length} present
          </p>
        </div>

        <div className='max-h-96 overflow-y-auto border border-gray-300 rounded-lg'>
          {sortedAttendance.length === 0 ? (
            <p className='text-center py-8 text-gray-500'>No members found</p>
          ) : (
            <div className='divide-y divide-gray-200'>
              {sortedAttendance.map((record) => {
                const badge = getStatusBadge(record.status);

                return (
                  <div
                    key={record.attendanceId}
                    className='flex items-center space-x-3 p-4'
                  >
                    <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center flex-shrink-0'>
                      <span className='text-white text-sm font-semibold'>
                        {record.user?.firstName.charAt(0)}
                      </span>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-900'>
                        {record.user?.firstName} {record.user?.lastName}
                      </p>
                      <p className='text-xs text-gray-500 truncate'>
                        {record.user?.email}
                      </p>
                      <p className='text-xs text-gray-400'>
                        NUID: {record.user?.nuid}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className='flex space-x-3 pt-6 border-t border-gray-200 mt-6'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceMeetingView;
