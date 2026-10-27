import { RequestApiData } from '@/types';
import { Calendar, Clock, DoorOpen, FileText, Globe, Hourglass, SquareCheck, SquareX, User } from 'lucide-react';
import React from 'react';
import {
  formatMeetingDate,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';

interface ViewRequestsModalProps {
  myRequests: RequestApiData[];

  setShowMyRequestsModal: (show: boolean) => void;
}

const ViewRequestsModal: React.FC<ViewRequestsModalProps> = ({
  myRequests,
  setShowMyRequestsModal,
}) => {
  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-xl font-semibold text-gray-900 mb-6'>
          My Submitted Requests
        </h3>

        {myRequests.length === 0 ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
              <FileText className='w-8 h-8 text-gray-400' />
            </div>
            <p className='text-gray-500 text-lg font-medium'>
              No requests found
            </p>
            <p className='text-gray-400 text-sm'>
              You haven't submitted any pending attendance requests.
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {myRequests.map((request) => (
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
                            {formatMeetingDate(request.attendance.meeting.date)}
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

                    {/* Request Details */}
                    <div className='bg-gray-50 rounded-lg p-3 mb-3'>
                      <div className='flex flex-wrap gap-2 mb-2'>
                        {request.attendanceMode === 'ONLINE' && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full'>
                            <Globe className='w-3 h-3' aria-hidden='true'/> Attending Online
                          </span>
                        )}
                        {request.attendanceMode === 'IN_PERSON' && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'>
                            <User className='w-3 h-3' aria-hidden='true'/> Attending In Person
                          </span>
                        )}
                        {request.timeAdjustment === 'ARRIVING_LATE' && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full'>
                            <Clock className='w-3 h-3' aria-hidden='true'/> Arriving Late
                          </span>
                        )}
                        {request.timeAdjustment === 'LEAVING_EARLY' && (
                          <span className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full'>
                            <DoorOpen className='w-3 h-3' aria-hidden='true'/> Leaving Early
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-gray-700'>
                        <span className='font-medium'>Explanation: </span>
                        {request.reason}
                      </p>
                    </div>

                    {/* Request Status (pending only in this view) */}
                    <div className='mt-3'>
                      {request.attendance.status === 'PENDING' && (
                        <span className='inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800'>
                          <Hourglass className='w-3 h-3' aria-hidden='true' /> Pending
                        </span>
                      )}
                      {request.attendance.status === 'UNEXCUSED_ABSENCE' && (
                        <span className='inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800'>
                          <SquareX className='w-3 h-3' aria-hidden='true'/> Denied
                        </span>
                      )}
                      {request.attendance.status === 'EXCUSED_ABSENCE' && (
                        <span className='inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800'>
                          <SquareCheck className='w-3 h-3' aria-hidden='true'/> Approved
                        </span>
                      )}
                    </div>
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
            onClick={() => setShowMyRequestsModal(false)}
            className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewRequestsModal;
