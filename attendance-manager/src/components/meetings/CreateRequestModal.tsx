import { MeetingApiData, RequestForm } from '@/types';
import React from 'react';
import {
  formatMeetingDate,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';
import { isMeetingRequestLate } from '@/utils/meeting-time';

interface CreateRequestModalProps {
  upcomingMeetingsList: MeetingApiData[];
  requestForm: RequestForm;

  setRequestForm: (request: RequestForm) => void;

  setShowCreateRequestModal: (show: boolean) => void;
  handleSubmitRequest: () => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({
  upcomingMeetingsList,
  requestForm,
  setRequestForm,
  setShowCreateRequestModal,
  handleSubmitRequest,
}) => {
  const lateMeetings = upcomingMeetingsList.filter(
    (meeting) =>
      requestForm.selectedMeetings.includes(meeting.meetingId) &&
      isMeetingRequestLate(meeting.startTime),
  );

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-xl font-semibold text-gray-900 mb-6'>
          Create Attendance Request
        </h3>

        {/* Select Upcoming Meetings */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-3'>
            Select Meeting(s)
          </label>
          <div className='max-h-48 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-3'>
            {upcomingMeetingsList.length === 0 ? (
              <p className='text-center py-4 text-gray-500'>
                No upcoming meetings available
              </p>
            ) : (
              upcomingMeetingsList.map((meeting) => (
                <label
                  key={meeting.meetingId}
                  className='flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={requestForm.selectedMeetings.includes(
                      meeting.meetingId,
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRequestForm({
                          ...requestForm,
                          selectedMeetings: [
                            ...requestForm.selectedMeetings,
                            meeting.meetingId,
                          ],
                        });
                      } else {
                        setRequestForm({
                          ...requestForm,
                          selectedMeetings: requestForm.selectedMeetings.filter(
                            (id) => id !== meeting.meetingId,
                          ),
                        });
                      }
                    }}
                    className='w-4 h-4 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
                  />
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-gray-900'>
                      {meeting.name}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {formatMeetingDate(meeting.date)} •{' '}
                      {formatMeetingTime(meeting.startTime)} -{' '}
                      {formatMeetingTime(meeting.endTime)}
                    </p>
                    {meeting.notes && (
                      <p className='text-xs text-gray-400 mt-1'>
                        {meeting.notes}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>
          <p className='text-sm text-gray-500 mt-2'>
            {requestForm.selectedMeetings.length} meeting(s) selected
          </p>
          {lateMeetings.length > 0 && (
            <div
              role='alert'
              className='mt-3 p-4 bg-amber-50 border border-amber-300 rounded-xl'
            >
              <p className='text-sm font-medium text-amber-900'>
                ⏰ This request will be marked as late
              </p>
              <p className='text-xs text-amber-800 mt-1'>
                Requests made less than 24 hours before a meeting are still
                submitted, but they are flagged as late so the E-board can
                review them. Late for:{' '}
                {lateMeetings.map((meeting) => meeting.name).join(', ')}.
              </p>
            </div>
          )}
        </div>

        {/* Request Type Checkboxes */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-3'>
            Request Type
          </label>
          <div className='space-y-3'>
            <label className='flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer'>
              <input
                type='checkbox'
                checked={requestForm.requestTypes.leavingEarly}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requestTypes: {
                      ...requestForm.requestTypes,
                      leavingEarly: e.target.checked,
                    },
                  })
                }
                className='w-4 h-4 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
              />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Leaving Early
                </p>
                <p className='text-xs text-gray-500'>
                  I need to leave the meeting early
                </p>
              </div>
            </label>

            <label className='flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer'>
              <input
                type='checkbox'
                checked={requestForm.requestTypes.comingLate}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requestTypes: {
                      ...requestForm.requestTypes,
                      comingLate: e.target.checked,
                    },
                  })
                }
                className='w-4 h-4 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
              />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>Coming Late</p>
                <p className='text-xs text-gray-500'>
                  I will arrive late to the meeting
                </p>
              </div>
            </label>

            <label className='flex items-center space-x-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer'>
              <input
                type='checkbox'
                checked={requestForm.requestTypes.goingOnline}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requestTypes: {
                      ...requestForm.requestTypes,
                      goingOnline: e.target.checked,
                    },
                  })
                }
                className='w-4 h-4 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
              />
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>
                  Attending Online
                </p>
                <p className='text-xs text-gray-500'>
                  I will attend the meeting online instead of in person
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Explanation Text Box */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Explanation
          </label>
          <textarea
            value={requestForm.explanation}
            onChange={(e) =>
              setRequestForm({
                ...requestForm,
                explanation: e.target.value,
              })
            }
            className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
            placeholder='Please provide a brief explanation for your request...'
            rows={4}
            required
          />
        </div>

        {/* Action Buttons */}
        <div className='flex space-x-4 pt-6 border-t border-gray-200'>
          <button
            type='button'
            onClick={() => {
              setShowCreateRequestModal(false);
              setRequestForm({
                selectedMeetings: [],
                requestTypes: {
                  leavingEarly: false,
                  comingLate: false,
                  goingOnline: false,
                },
                explanation: '',
              });
            }}
            className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSubmitRequest}
            className='flex-1 px-6 py-3 bg-[#C8102E] text-white rounded-xl hover:bg-[#A8102E] transition-colors font-medium'
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRequestModal;
