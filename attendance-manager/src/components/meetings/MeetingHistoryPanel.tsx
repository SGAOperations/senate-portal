import { MeetingApiData, MeetingType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from 'lucide-react';
import React from 'react';

interface MeetingHistoryPanelProps {
  setActiveTab: (option: 'past' | 'upcoming') => void;
  activeTab: 'past' | 'upcoming';
  typeFilter: MeetingType | null;

  setTypeFilter: (type: MeetingType | null) => void;
  meetings: MeetingApiData[];

  handleEditMeeting: (meeting: MeetingApiData) => void;
  handleDeleteMeeting: (meeting: MeetingApiData) => void;
  visibleMeetings: MeetingApiData[];
}

const MeetingHistoryPanel: React.FC<MeetingHistoryPanelProps> = ({
  setActiveTab,
  activeTab,
  typeFilter,
  setTypeFilter,
  handleEditMeeting,
  handleDeleteMeeting,
  visibleMeetings,
}) => {
  //helper function that formats meeting type from all caps to normal
  const formatMeetingType = (type: string): string => {
    if (type === 'FULL_BODY') {
      return 'Full Body';
    } else if (type === 'REGULAR') {
      return 'Regular';
    }
    return type;
  };
  const { user } = useAuth();
  const isEboard = user?.role === 'EBOARD';

  return (
    <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-gray-900'>Meeting History</h2>

        {/* Tab Buttons */}
        <div className='flex space-x-2'>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'past'
                ? 'bg-[#C8102E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Past Meetings
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'upcoming'
                ? 'bg-[#C8102E] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Upcoming Meetings
          </button>
        </div>
      </div>

      {/* Table */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-gray-200'>
              <th className='text-left py-3 px-4 font-medium text-gray-900'>
                Date
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900'>
                Meeting
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900'>
                Description
              </th>
              <th className='text-left py-3 px-4 font-medium text-gray-900'>
                <details className='inline-block'>
                  <summary className='list-none cursor-pointer hover:underline select-none'>
                    Type&#9662;
                    {typeFilter ? ` (${formatMeetingType(typeFilter)})` : ''}
                  </summary>
                  <div className='absolute z-10 mt-2 w-40 rounded-md border bg-white shadow'>
                    <button
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                        typeFilter === null ? 'font-semibold' : ''
                      }`}
                      onClick={() => {
                        setTypeFilter(null);
                        (document.activeElement as HTMLElement | null)?.blur(); // close <details> quickly
                      }}
                    >
                      All
                    </button>
                    <div className='border-t my-1' />
                    {['FULL_BODY', 'REGULAR'].map((t) => {
                      const label =
                        t === 'FULL_BODY'
                          ? 'Full Body'
                          : t.charAt(0) + t.slice(1).toLowerCase(); // REGULAR → Regular
                      return (
                        <button
                          key={t}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                            typeFilter === t ? 'font-semibold' : ''
                          }`}
                          onClick={() => {
                            setTypeFilter(t as MeetingType);
                            (
                              document.activeElement as HTMLElement | null
                            )?.blur();
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </details>
              </th>
              <th className='text-right py-3 px-4 font-medium text-gray-900'>
                # of Members
              </th>
              {isEboard && (
                <th className='text-center py-3 px-4 font-medium text-gray-900'>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
          {visibleMeetings.map((meeting) => (
              <tr
                key={meeting.meetingId}
                className='border-b border-gray-100 hover:bg-gray-50'
              >
                <td className='py-3 px-4'>
                  <div className='text-sm text-gray-900'>{meeting.date}</div>
                  <div className='text-xs text-gray-500'>
                    {meeting.startTime} - {meeting.endTime}
                  </div>
                </td>
                <td className='py-3 px-4'>
                  <div className='text-sm font-medium text-gray-900'>
                    {meeting.name}
                  </div>
                  <div className='text-xs text-gray-500'>
                    {formatMeetingType(meeting.type)}
                  </div>
                </td>
                <td className='py-3 px-4'>
                  <div className='text-sm text-gray-600'>{meeting.notes}</div>
                </td>
                <td className='py-3 px-4'>
                  <div className='text-sm font-medium text-gray-900'>
                    {formatMeetingType(meeting.type)}
                  </div>
                </td>
                <td className='py-3 px-4 text-right'>
                  <div className='text-sm font-medium text-gray-900'>
                    {meeting.attendance?.length || 0}
                  </div>
                </td>
                <td className='py-3 px-4 text-center'>
                  {isEboard && (
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={() => handleEditMeeting(meeting)}
                        className='px-3 py-1 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#A8102E] transition-colors'
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMeeting(meeting)}
                        className='px-3 py-1 bg-[#C8102E] text-white text-sm rounded-lg hover:bg-[#A8102E] transition-colors'
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {visibleMeetings.length === 0 && (
        <div className='text-center py-12'>
          <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
            <Calendar className='w-8 h-8 text-gray-400' />
          </div>
          <p className='text-gray-500 text-lg font-medium'>
            No {activeTab === 'past' ? 'past' : 'upcoming'} meetings
          </p>
          <p className='text-gray-400 text-sm'>
            {activeTab === 'past'
              ? 'No meeting history available'
              : 'No upcoming meetings scheduled'}
          </p>
        </div>
      )}
    </div>
  );
};

export default MeetingHistoryPanel;
