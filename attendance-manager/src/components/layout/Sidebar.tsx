import React from 'react';
import { LayoutDashboard, Calendar, Vote, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MeetingApiData, UserApiData, AttendanceApiData } from '@/types';

interface SidebarProps {
  activeTab: 'dashboard' | 'meetings' | 'voting' | 'attendance' | 'profile';
  onTabChange: (
    tab: 'dashboard' | 'meetings' | 'voting' | 'attendance' | 'profile',
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'EBOARD';

  const [meetings, setMeetings] = React.useState<MeetingApiData[]>([]);
  const [users, setUsers] = React.useState<UserApiData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch meetings
        const meetingsResponse = await fetch('/api/meeting');
        if (!meetingsResponse.ok) throw new Error('Failed to fetch meetings');
        const meetingsData = await meetingsResponse.json();
        setMeetings(meetingsData);

        // Fetch users (for total members count)
        if (isAdmin) {
          const usersResponse = await fetch('/api/users');
          if (!usersResponse.ok) throw new Error('Failed to fetch users');
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.date);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate.getTime() === today.getTime();
  }).length;

  const pendingAttendance = meetings.filter((m) => {
    const meetingDate = new Date(m.date);
    if (meetingDate > today) {
      return false; // Only past meetings
    }
    return m.attendance.some(
      (a: AttendanceApiData) =>
        a.userId === user?.id && a.status === 'UNEXCUSED_ABSENCE',
    );
  }).length;

  const totalMembers = users.length;

  const iconClass = 'w-6 h-6';
  const navItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: <LayoutDashboard className={iconClass} />,
      adminOnly: false,
    },
    {
      id: 'meetings' as const,
      label: 'Meetings',
      icon: <Calendar className={iconClass} />,
      adminOnly: false,
    },
    {
      id: 'voting' as const,
      label: 'Voting',
      icon: <Vote className={iconClass} />,
      adminOnly: false,
    },
    {
      id: 'attendance' as const,
      label: 'Attendance',
      icon: <ClipboardList className={iconClass} />,
      adminOnly: true,
    },
  ];

  return (
    <div className='w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col min-h-screen'>
      <div className='flex-1 flex flex-col'>
        <div className='p-6 flex-1'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Navigation
          </h2>
          <nav className='space-y-2'>
            {navItems.map((item) => {
              // Skip admin-only items for non-admin users
              if (item.adminOnly && !isAdmin) {
                return null;
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    activeTab === item.id
                      ? 'bg-[#C8102E] text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 ${
                      activeTab === item.id ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className='font-medium'>{item.label}</span>
                  {item.adminOnly && (
                    <span className='ml-auto px-2 py-1 text-xs bg-[#A4804A] text-white rounded-full'>
                      Admin
                    </span>
                  )}
                  {activeTab === item.id && (
                    <div className='ml-auto w-2 h-2 bg-white rounded-full'></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Stats - Fixed at bottom */}
        <div className='p-6 border-t border-gray-200 flex-shrink-0'>
          <h3 className='text-sm font-medium text-gray-900 mb-3'>
            Quick Stats
          </h3>
          {error ? (
            <p className='text-xs text-red-500'>Failed to load stats</p>
          ) : loading ? (
            <p className='text-xs text-gray-400'>Loading...</p>
          ) : (
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>Today's Meetings</span>
                <span className='text-sm font-semibold text-[#C8102E]'>
                  {todaysMeetings}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>
                  Pending Attendance
                </span>
                <span className='text-sm font-semibold text-[#A4804A]'>
                  {pendingAttendance}
                </span>
              </div>
              {isAdmin && (
                <>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>Total Members</span>
                    <span className='text-sm font-semibold text-[#C8102E]'>
                      {totalMembers}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span className='text-xs text-gray-500'>Admin Access</span>
                    <span className='text-sm font-semibold text-[#A4804A]'>
                      ✓
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
