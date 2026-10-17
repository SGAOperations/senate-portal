import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Dashboard from '@/components/dashboard/Dashboard';
import MeetingsPage from '@/components/meetings/MeetingsPage';
import VotingPage from '@/components/voting/VotingPage';
import AttendancePage from '@/components/attendance/AttendancePage';
import ProfilePage from '@/components/profile/ProfilePage';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '../profile/LoginPage';
import { useActiveVotingEvent } from '@/hooks/useActiveVotingEvent';
import ActiveVotingModal from '@/components/voting/ActiveVotingModal';
import { TriangleAlert } from 'lucide-react';

const Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'meetings' | 'voting' | 'attendance' | 'profile'
  >('dashboard');
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'EBOARD';
  const { activeEvent } = useActiveVotingEvent();
  const [canVoteInActiveEvent, setCanVoteInActiveEvent] = useState(false);

  useEffect(() => {
    if (!user || !activeEvent) {
      setCanVoteInActiveEvent(false);
      return;
    }

    let isCancelled = false;

    const checkMeetingSignInStatus = async () => {
      setCanVoteInActiveEvent(false);

      try {
        // check if user is signed in to the meeting associated with the active voting event
        const res = await fetch(
          `/api/attendance/meeting/${activeEvent.meetingId}`,
        );

        if (!res.ok) {
          throw new Error('Failed to fetch meeting attendance');
        }

        const attendanceRecords: Array<{
          userId: string;
          status: string;
        }> = await res.json();

        const isPresent = attendanceRecords.some(
          (record) => record.userId === user.id && record.status === 'PRESENT',
        );

        if (!isPresent) {
          if (!isCancelled) {
            setCanVoteInActiveEvent(false);
          }
          return;
        }

        // Check if user has already voted for this event
        const hasVotedRes = await fetch(
          `/api/voting-record/has-voted/${activeEvent.votingEventId}`,
        );

        if (!hasVotedRes.ok) {
          throw new Error('Failed to fetch voting records');
        }
        const hasAlreadyVoted = await hasVotedRes.json();

        if (!isCancelled) {
          setCanVoteInActiveEvent(!hasAlreadyVoted.hasVoted);
        }
      } catch {
        if (!isCancelled) {
          setCanVoteInActiveEvent(false);
        }
      }
    };

    checkMeetingSignInStatus();

    return () => {
      isCancelled = true;
    };
  }, [activeEvent, user]);

  const handleProfileClick = () => {
    setActiveTab('profile');
  };
  const handleLogoClick = () => {
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'meetings':
        return <MeetingsPage />;
      case 'voting':
        return <VotingPage />;
      case 'attendance':
        // Check if user is admin
        if (isAdmin) {
          return <AttendancePage />;
        } else {
          return (
            <div className='flex-1 p-6 bg-gray-50 min-h-screen'>
              <div className='mb-6'>
                <h1 className='text-2xl font-bold text-gray-900 mb-2'>
                  Access Denied
                </h1>
                <p className='text-gray-600'>
                  You need admin privileges to access the attendance page.
                </p>
              </div>
              <div className='bg-white rounded-2xl shadow-lg p-6 border border-gray-100'>
                <div className='text-center py-12'>
                  <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                    <TriangleAlert className='w-8 h-8 text-red-600' />
                  </div>
                  <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                    Admin Access Required
                  </h2>
                  <p className='text-gray-600'>
                    Only administrators can view attendance records and manage
                    members.
                  </p>
                </div>
              </div>
            </div>
          );
        }
      case 'profile':
        return <ProfilePage />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <p className='text-sm text-gray-600'>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <Header
        onProfileClick={handleProfileClick}
        onLogoClick={handleLogoClick}
      />
      <div className='flex flex-1'>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className='flex-1 relative'>
          {renderContent()}
          {activeEvent && canVoteInActiveEvent && (
            <ActiveVotingModal event={activeEvent} />
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
