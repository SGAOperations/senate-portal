import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../profile/LoginPage';
import { User } from '@/types';
import ViewMeetingModal from './ViewMeetingModal';
import {
  formatCalendarDateKey,
  formatMeetingDateLabel,
  formatMeetingTime,
} from '@/meeting/meetingDateTime';
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface Meeting {
  meetingId: string;
  name: string;
  startTime: string;
  endTime: string;
  date: string;
  notes: string;
  type: 'FULL_BODY' | 'REGULAR';
}

// API service functions with endpoints
const meetingAPI = {
  async getAllMeetings(): Promise<Meeting[]> {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch('/api/meeting');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meetings (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getMeetingsByDate(): Promise<Record<string, Meeting[]>> {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch('/api/meeting/by-date');

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meetings by date (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getMeeting(meetingId: string): Promise<Meeting> {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(`/api/meeting/${meetingId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch meeting (${response.status}): ${errorText}`,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },
};

const Dashboard: React.FC = () => {
  const user = useContext<User>(UserContext);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingsByDate, setMeetingsByDate] = useState<
    Record<string, Meeting[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load meetings data on component mount
  useEffect(() => {
    const loadMeetings = async () => {
      try {
        setLoading(true);
        setError(null);

        const [allMeetings, groupedMeetings] = await Promise.all([
          meetingAPI.getAllMeetings(),
          meetingAPI.getMeetingsByDate(),
        ]);

        setMeetings(allMeetings);
        setMeetingsByDate(groupedMeetings);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load meetings',
        );
      } finally {
        setLoading(false);
      }
    };

    loadMeetings();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Adds days from previous month
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDate - i));
    }

    // Add days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add head of next month until total is in 7-days format
    let nextDay = 1;

    while (days.length % 7 !== 0) {
      days.push(new Date(year, month + 1, nextDay++));
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const handleViewModal = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setShowViewModal(true);
  };

  const hasMeeting = (date: Date) => {
    const dateString = formatCalendarDateKey(date);
    return meetingsByDate[dateString] && meetingsByDate[dateString].length > 0;
  };

  const getMeetingsForDate = (date: Date) => {
    const dateString = formatCalendarDateKey(date);
    return meetingsByDate[dateString] || [];
  };

  // Get meetings within the next 3 weeks
  const getUpcomingMeetings = () => {
    const now = new Date();
    const threeWeeksFromNow = new Date(now);
    threeWeeksFromNow.setDate(now.getDate() + 21);

    return meetings
      .filter((meeting: Meeting) => {
        const meetingStart = new Date(meeting.startTime);
        return meetingStart >= now && meetingStart <= threeWeeksFromNow;
      })
      .sort(
        (a: Meeting, b: Meeting) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  };

  const getDisplayMeetings = () => {
    if (selectedDate) {
      return getMeetingsForDate(selectedDate);
    }
    return getUpcomingMeetings();
  };

  const days = getDaysInMonth(currentDate);
  const displayMeetings = getDisplayMeetings();

  if (loading) {
    return (
      <div className='flex-1 p-6 bg-gray-50'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E] mx-auto mb-4'></div>
            <p className='text-gray-600'>Loading meetings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex-1 p-6 bg-gray-50'>
        <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
          <div className='flex items-center'>
            <AlertCircle className='w-5 h-5 text-red-400 mr-2' />
            <p className='text-red-800'>Error: {error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className='mt-2 text-red-600 hover:text-red-800 text-sm font-medium'
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 p-6 bg-gray-50'>
      <div>{user.email}</div>
      {/* Header Section */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 mb-2'>Dashboard</h1>
        <p className='text-gray-600'>
          {selectedDate
            ? `Meetings for ${selectedDate.toLocaleDateString()}`
            : 'Upcoming meetings (next 3 weeks)'}
        </p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Calendar Section */}
        <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-900'>Calendar</h2>
            <div className='flex space-x-2'>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() - 1,
                    ),
                  )
                }
                className='p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors'
              >
                <ChevronLeft className='w-5 h-5' />
              </button>
              <button
                onClick={() =>
                  setCurrentDate(
                    new Date(
                      currentDate.getFullYear(),
                      currentDate.getMonth() + 1,
                    ),
                  )
                }
                className='p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors'
              >
                <ChevronRight className='w-5 h-5' />
              </button>
            </div>
          </div>

          <div className='mb-6'>
            <h3 className='text-lg font-medium text-gray-900 mb-2'>
              {formatDate(currentDate)}
            </h3>
            <div className='w-16 h-1 bg-[#C8102E] rounded-full'></div>
          </div>

          <div className='grid grid-cols-7 gap-1 mb-4'>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className='text-center text-sm font-medium text-gray-500 py-2'
              >
                {day}
              </div>
            ))}
          </div>

          <div className='grid grid-cols-7 gap-1'>
            {days.map((day, index) => {
              // gets days in current month
              const inCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div key={index} className='aspect-square p-1'>
                  <button
                    onClick={() => {
                      if (!inCurrentMonth) {
                        // navigate the calendar to the clicked day's month
                        setCurrentDate(
                          new Date(day.getFullYear(), day.getMonth(), 1),
                        );
                      }
                      setSelectedDate(day);
                    }}
                    className={`w-full h-full flex flex-col items-center justify-center text-sm rounded-xl transition-all duration-200 ${
                      inCurrentMonth
                        ? isToday(day)
                          ? 'bg-[#C8102E] text-white shadow-lg'
                          : isSelected(day)
                            ? 'bg-[#C8102E] bg-opacity-10 text-[#C8102E] border-2 border-[#C8102E]'
                            : hasMeeting(day)
                              ? 'bg-[#A4804A] bg-opacity-10 text-[#A4804A] hover:bg-[#A4804A] hover:bg-opacity-20'
                              : 'hover:bg-gray-100'
                        : 'text-gray-400 bg-gray-50'
                    }`}
                  >
                    <span className='font-medium'>{day.getDate()}</span>
                    {inCurrentMonth && hasMeeting(day) && (
                      <div className='w-2 h-2 bg-[#A4804A] rounded-full mt-1'></div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Clear Selection Button */}
          {selectedDate && (
            <div className='mt-4 text-center'>
              <button
                onClick={() => setSelectedDate(null)}
                className='text-sm text-[#C8102E] hover:text-[#A8102E] font-medium'
              >
                Show upcoming meetings (next 3 weeks)
              </button>
            </div>
          )}
        </div>

        {/* Meetings List Section */}
        <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-gray-900'>
              {selectedDate ? 'Scheduled Meetings' : 'Upcoming Meetings'}
            </h2>
            <span className='text-sm text-gray-500'>
              {selectedDate
                ? selectedDate.toLocaleDateString()
                : `${displayMeetings.length} meetings`}
            </span>
          </div>

          <div className='space-y-4 max-h-96 overflow-y-auto'>
            {displayMeetings.length === 0 ? (
              <div className='text-center py-12'>
                <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Calendar className='w-8 h-8 text-gray-400' />
                </div>
                <p className='text-gray-500 text-lg font-medium'>
                  {selectedDate
                    ? 'No meetings scheduled'
                    : 'No upcoming meetings'}
                </p>
                <p className='text-gray-400 text-sm'>
                  {selectedDate
                    ? `for ${selectedDate.toLocaleDateString()}`
                    : 'in the next 3 weeks'}
                </p>
              </div>
            ) : (
              displayMeetings.map((meeting) => (
                <div
                  key={meeting.meetingId}
                  className='border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow'
                >
                  <div className='flex justify-between items-start mb-3'>
                    <h3 className='font-semibold text-gray-900 text-lg'>
                      {meeting.name}
                    </h3>
                    <span className='px-3 py-1 text-xs font-medium rounded-full bg-[#A4804A] bg-opacity-10 text-[#A4804A]'>
                      Meeting
                    </span>
                  </div>
                  <div className='flex items-center space-x-4 text-sm text-gray-500 mb-3'>
                    <div className='flex items-center space-x-1'>
                      <Calendar className='w-4 h-4' />
                      <span>{formatMeetingDateLabel(meeting.date)}</span>
                    </div>
                    <div className='flex items-center space-x-1'>
                      <Clock className='w-4 h-4' />
                      <span>
                        {formatMeetingTime(meeting.startTime)} -{' '}
                        {formatMeetingTime(meeting.endTime)}
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-1'></div>
                    <button
                      onClick={() => handleViewModal(meeting)}
                      className='text-[#C8102E] hover:text-[#A8102E] text-sm font-medium'
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {showViewModal && selectedMeeting && (
        <ViewMeetingModal
          meeting={selectedMeeting}
          setShowViewMeetingModal={setShowViewModal}
        />
      )}
    </div>
  );
};

export default Dashboard;
