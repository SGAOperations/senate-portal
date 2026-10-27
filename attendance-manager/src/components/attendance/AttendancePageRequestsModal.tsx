import { RequestApiData } from '@/types';
import { Calendar, Clock, FileText } from 'lucide-react';
import React from 'react';
import {
  formatMeetingDate,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';

interface AttendancePageRequestsModalProps {
  setRequestsView: (view: 'history' | 'active') => void;
  requestsView: 'history' | 'active';
  requests: RequestApiData[];
  declinedRequestIds: string[];

  setRequests: (requests: RequestApiData[]) => void;

  setDeclinedRequestIds: (ids: string[]) => void;

  setShowRequestsModal: (show: boolean) => void;
}

const AttendancePageRequestsModal: React.FC<
  AttendancePageRequestsModalProps
> = ({
  setRequestsView,
  requestsView,
  requests,
  declinedRequestIds,
  setRequests,
  setDeclinedRequestIds,
  setShowRequestsModal,
}) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-xl font-semibold text-gray-900'>
            Attendance Requests
          </h3>
          <div className='inline-flex rounded-full border border-gray-200 bg-gray-50 p-1'>
            <button
              type='button'
              onClick={() => setRequestsView('active')}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                requestsView === 'active'
                  ? 'bg-white text-[#C8102E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Active
            </button>
            <button
              type='button'
              onClick={() => setRequestsView('history')}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                requestsView === 'history'
                  ? 'bg-white text-[#C8102E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {requests.filter((r: any) =>
          requestsView === 'active'
            ? r.attendance?.status !== 'EXCUSED_ABSENCE' &&
              !declinedRequestIds.includes(r.requestId)
            : r.attendance?.status === 'EXCUSED_ABSENCE' ||
              declinedRequestIds.includes(r.requestId),
        ).length === 0 ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <FileText className='w-8 h-8 text-gray-400' />
            </div>
            <p className='text-gray-500 text-lg font-medium'>
              {requestsView === 'active'
                ? 'No active requests'
                : 'No historical requests'}
            </p>
            <p className='text-gray-400 text-sm'>
              {requestsView === 'active'
                ? 'There are no active attendance requests at this time.'
                : 'Approved requests will appear here.'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {requests
              .filter((r: any) =>
                requestsView === 'active'
                  ? r.attendance?.status !== 'EXCUSED_ABSENCE' &&
                    !declinedRequestIds.includes(r.requestId)
                  : r.attendance?.status === 'EXCUSED_ABSENCE' ||
                    declinedRequestIds.includes(r.requestId),
              )
              .map((request) => (
                <div
                  key={request.requestId}
                  className='border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow'
                >
                  <div className='flex justify-between items-start mb-4'>
                    <div className='flex-1'>
                      {/* Meeting Info */}
                      <div className='mb-3'>
                        <h4 className='text-lg font-semibold text-gray-900 mb-1'>
                          {request.attendance.meeting.name}
                        </h4>
                        <div className='flex items-center space-x-4 text-sm text-gray-600 mb-2'>
                          <div className='flex items-center space-x-1'>
                            <Calendar className='w-4 h-4' />
                            <span>
                              {formatMeetingDate(
                                request.attendance.meeting.date,
                              )}
                            </span>
                          </div>
                          <div className='flex items-center space-x-1'>
                            <Clock className='w-4 h-4' />
                            <span>
                              {formatMeetingTime(
                                request.attendance.meeting.startTime,
                              )}{' '}
                              -{' '}
                              {formatMeetingTime(
                                request.attendance.meeting.endTime,
                              )}
                            </span>
                          </div>
                        </div>
                        {request.attendance.meeting.notes && (
                          <p className='text-xs text-gray-500 mt-1'>
                            {request.attendance.meeting.notes}
                          </p>
                        )}
                      </div>

                      {/* Member Info */}
                      <div className='flex items-center space-x-3 mb-3'>
                        <div className='w-10 h-10 bg-[#C8102E] rounded-full flex items-center justify-center flex-shrink-0'>
                          <span className='text-white text-sm font-semibold'>
                            {request.attendance.user.firstName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-900'>
                            {request.attendance.user.firstName}{' '}
                            {request.attendance.user.lastName}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {request.attendance.user.email}
                          </p>
                          <p className='text-xs text-gray-400'>
                            NUID: {request.attendance.user.nuid}
                          </p>
                        </div>
                      </div>

                      {/* Request Details */}
                      <div className='bg-gray-50 rounded-lg p-3 mb-3'>
                        <div className='flex flex-wrap gap-2 mb-2'>
                          {request.attendanceMode === 'ONLINE' && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full'>
                              🌐 Attending Online
                            </span>
                          )}
                          {request.attendanceMode === 'IN_PERSON' && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'>
                              👤 Attending In Person
                            </span>
                          )}
                          {request.attendanceMode === 'ABSENT' && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded-full'>
                              🚫 Not Attending
                            </span>
                          )}
                          {request.timeAdjustment === 'ARRIVING_LATE' && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full'>
                              ⏰ Arriving Late
                            </span>
                          )}
                          {request.timeAdjustment === 'LEAVING_EARLY' && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full'>
                              🚪 Leaving Early
                            </span>
                          )}
                          {request.isLate && (
                            <span className='inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full'>
                              ⏰ Late Request
                            </span>
                          )}
                        </div>
                        <p className='text-sm text-gray-700'>
                          <span className='font-medium'>Explanation: </span>
                          {request.reason}
                        </p>
                      </div>

                      {/* Action Buttons for Active tab only */}
                      {requestsView === 'active' ? (
                        <div className='flex space-x-3 pt-3 border-t border-gray-200'>
                          <button
                            onClick={async () => {
                              try {
                                const updateResponse = await fetch(
                                  `/api/attendance/${request.attendance.attendanceId}`,
                                  {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      status: 'EXCUSED_ABSENCE',
                                    }),
                                  },
                                );

                                if (!updateResponse.ok)
                                  throw new Error(
                                    'Failed to update attendance',
                                  );

                                alert(
                                  `Request accepted! Attendance updated for ${request.attendance.user.firstName} ${request.attendance.user.lastName}`,
                                );

                                const response = await fetch('/api/requests');
                                if (response.ok) {
                                  const fetchedRequests = await response.json();
                                  setRequests(fetchedRequests || []);
                                  setDeclinedRequestIds([]);
                                }
                              } catch (error) {
                                alert(
                                  `Failed to accept request: ${
                                    error instanceof Error
                                      ? error.message
                                      : 'Unknown error'
                                  }`,
                                );
                              }
                            }}
                            className='flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium'
                          >
                            ✓ Accept
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const updateResponse = await fetch(
                                  `/api/attendance/${request.attendance.attendanceId}`,
                                  {
                                    method: 'PATCH',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                      status: 'UNEXCUSED_ABSENCE',
                                    }),
                                  },
                                );

                                if (!updateResponse.ok)
                                  throw new Error(
                                    'Failed to update attendance',
                                  );

                                alert(
                                  `Request rejected for ${request.attendance.user.firstName} ${request.attendance.user.lastName}`,
                                );

                                setDeclinedRequestIds([
                                  ...declinedRequestIds,
                                  request.requestId,
                                ]);
                              } catch (error) {
                                alert(
                                  `Failed to reject request: ${
                                    error instanceof Error
                                      ? error.message
                                      : 'Unknown error'
                                  }`,
                                );
                              }
                            }}
                            className='flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium'
                          >
                            ✗ Reject
                          </button>
                        </div>
                      ) : (
                        <div className='mt-3'>
                          {request.attendance.status === 'PENDING' && (
                            <span className='inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800'>
                              <Clock className='w-3 h-3' aria-hidden='true' />
                              Pending
                            </span>
                          )}

                          {request.attendance.status ===
                            'UNEXCUSED_ABSENCE' && (
                            <span className='inline-block px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800'>
                              ❌ Denied
                            </span>
                          )}

                          {request.attendance.status === 'EXCUSED_ABSENCE' && (
                            <span className='inline-block px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800'>
                              ✅ Approved
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Close Button */}
        <div className='flex justify-end mt-6 pt-6 border-t border-gray-200'>
          <button
            type='button'
            onClick={() => setShowRequestsModal(false)}
            className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendancePageRequestsModal;
