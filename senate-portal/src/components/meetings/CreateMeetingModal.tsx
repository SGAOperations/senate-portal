import { MeetingType, MeetingApiData, UserSchema } from '@/types';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import React from 'react';

interface CreateMeetingModalProps {
  newMeeting: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    type: MeetingType;
    selectedAttendees: string[];
  };

  setNewMeeting: (meeting: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    notes: string;
    type: MeetingType;
    selectedAttendees: string[];
  }) => void;
  members: z.infer<typeof UserSchema>[];
  toggleNonEboardSelection: () => void;

  bulkSelectButtonClasses: (active: boolean) => string;
  bulkSelectionActive: {
    nonEboard: boolean;
    allMembers: boolean;
  };
  toggleAllMembersSelection: () => void;

  setShowCreateMeetingModal: (show: boolean) => void;

  setMeetings: (meetings: MeetingApiData[]) => void;
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  newMeeting,
  setNewMeeting,
  members,
  toggleNonEboardSelection,
  bulkSelectButtonClasses,
  bulkSelectionActive,
  toggleAllMembersSelection,
  setShowCreateMeetingModal,
  setMeetings,
}) => {
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  const filteredMembers = useMemo(() => {
    const query = searchMemberQuery?.trim() ?? '';
    if (!query) return members;
    const lowerQuery = query.toLowerCase();

    return members.filter(
      (member) =>
        `${member.firstName} ${member.lastName}`
          .toLowerCase()
          .includes(lowerQuery) ||
        member.email.toLowerCase().includes(lowerQuery),
    );
  }, [members, searchMemberQuery]);

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto'>
        <h3 className='text-xl font-semibold text-gray-900 mb-6'>
          Create New Meeting
        </h3>
        <form className='space-y-6'>
          {/* Meeting Name */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Meeting Name
            </label>
            <input
              type='text'
              value={newMeeting.name}
              onChange={(e) =>
                setNewMeeting({ ...newMeeting, name: e.target.value })
              }
              className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
              placeholder='Enter meeting name'
              required
            />
          </div>

          {/* Date and Time */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Date
              </label>
              <input
                type='date'
                value={newMeeting.date}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, date: e.target.value })
                }
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                Start Time
              </label>
              <input
                type='time'
                value={newMeeting.startTime}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, startTime: e.target.value })
                }
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>
                End Time
              </label>
              <input
                type='time'
                value={newMeeting.endTime}
                onChange={(e) =>
                  setNewMeeting({ ...newMeeting, endTime: e.target.value })
                }
                className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Notes
            </label>
            <textarea
              value={newMeeting.notes || ''}
              onChange={(e) =>
                setNewMeeting({ ...newMeeting, notes: e.target.value })
              }
              className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
              placeholder='Enter meeting notes or agenda'
              rows={3}
            />
          </div>

          {/* Meeting Type */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>
              Meeting Type
            </label>
            <select
              value={newMeeting.type || 'REGULAR'}
              onChange={(e) =>
                setNewMeeting({
                  ...newMeeting,
                  type: e.target.value as 'FULL_BODY' | 'REGULAR',
                })
              }
              className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
            >
              <option value='REGULAR'>Regular Meeting</option>
              <option value='FULL_BODY'>Full Body Meeting</option>
            </select>
          </div>

          {/* Attendees Selection */}
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-3'>
              Select Attendees
            </label>
            <input
              type='text'
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              placeholder='Search members...'
              className='w-full mb-4 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E]'
            />
            <div className='flex flex-wrap gap-2 mb-4'>
              <button
                type='button'
                onClick={toggleNonEboardSelection}
                className={bulkSelectButtonClasses(
                  bulkSelectionActive.nonEboard,
                )}
              >
                Select All Members (Non-Eboard)
              </button>
              <button
                type='button'
                onClick={toggleAllMembersSelection}
                className={bulkSelectButtonClasses(
                  bulkSelectionActive.allMembers,
                )}
              >
                Select Everyone (Eboard + Members)
              </button>
            </div>
            <div className='max-h-48 overflow-y-auto border border-gray-300 rounded-xl p-4 space-y-3'>
              {filteredMembers.length === 0 && (
                <p className='text-sm text-gray-500'>No members found.</p>
              )}

              {filteredMembers.map((member) => (
                <label
                  key={member.userId}
                  className='flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={newMeeting.selectedAttendees.includes(
                      member.userId,
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewMeeting({
                          ...newMeeting,
                          selectedAttendees: [
                            ...newMeeting.selectedAttendees,
                            member.userId,
                          ],
                        });
                      } else {
                        setNewMeeting({
                          ...newMeeting,
                          selectedAttendees:
                            newMeeting.selectedAttendees.filter(
                              (id) => id !== member.userId,
                            ),
                        });
                      }
                    }}
                    className='w-4 h-4 text-[#C8102E] border-gray-300 rounded focus:ring-[#C8102E]'
                  />
                  <div className='w-8 h-8 bg-[#C8102E] rounded-full flex items-center justify-center'>
                    <span className='text-white text-sm font-semibold'>
                      {member.firstName.charAt(0)}
                    </span>
                  </div>
                  <div className='flex-1'>
                    <p className='text-sm font-medium text-gray-900'>
                      {member.firstName} {member.lastName}
                    </p>
                    <p className='text-xs text-gray-500'>{member.email}</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        member.role.roleType === 'EBOARD'
                          ? 'bg-[#A4804A] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {member.role.roleType === 'EBOARD' ? 'Eboard' : 'Member'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <p className='text-sm text-gray-500 mt-2'>
              {newMeeting.selectedAttendees.length} member(s) selected
            </p>
          </div>

          {/* Action Buttons */}
          <div className='flex space-x-4 pt-6 border-t border-gray-200'>
            <button
              type='button'
              onClick={() => {
                setShowCreateMeetingModal(false);
                setNewMeeting({
                  name: '',
                  date: '',
                  startTime: '',
                  endTime: '',
                  notes: '',
                  type: 'REGULAR',
                  selectedAttendees: [],
                });
              }}
              className='flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='flex-1 px-6 py-3 bg-[#C8102E] text-white rounded-xl hover:bg-[#A8102E] transition-colors font-medium'
              onClick={async (e) => {
                e.preventDefault();

                try {
                  const response = await fetch('/api/meeting', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: newMeeting.name,
                      date: newMeeting.date,
                      startTime: newMeeting.startTime,
                      endTime: newMeeting.endTime,
                      notes: newMeeting.notes,
                      type: newMeeting.type,
                      attendeeIds: newMeeting.selectedAttendees,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error('Failed to create meeting');
                  }

                  await response.json();

                  // Refresh meetings list
                  const meetingsResponse = await fetch('/api/meeting');
                  const updatedMeetings = await meetingsResponse.json();
                  setMeetings(updatedMeetings);

                  // Close modal and reset form
                  setShowCreateMeetingModal(false);
                  setNewMeeting({
                    name: '',
                    date: '',
                    startTime: '',
                    endTime: '',
                    notes: '',
                    type: 'REGULAR',
                    selectedAttendees: [],
                  });

                  alert('Meeting created successfully!');
                } catch {
                  alert('Failed to create meeting. Please try again.');
                }
              }}
            >
              Create Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMeetingModal;
