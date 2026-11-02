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
import { TriangleAlert, Vote } from 'lucide-react';

const Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'meetings' | 'voting' | 'attendance' | 'profile'
  >('dashboard');
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'EBOARD';
  const { activeEvent } = useActiveVotingEvent();
  const [canVoteInActiveEvent, setCanVoteInActiveEvent] = useState(false);
  const [dismissedVoteId, setDismissedVoteId] = useState<string | null>(null);

  const userId = user?.id;
  const votingEventId = activeEvent?.votingEventId;
  const meetingId = activeEvent?.meetingId;

  useEffect(() => {
    // no polling once the member has dismissed this vote
    if (
      !userId ||
      !votingEventId ||
      !meetingId ||
      votingEventId === dismissedVoteId
    ) {
      setCanVoteInActiveEvent(false);
      return;
    }

    // new vote or user: don't carry over the previous result
    setCanVoteInActiveEvent(false);

    let isCancelled = false;
    let isChecking = false;
    let intervalId: number | undefined;

    const checkMeetingSignInStatus = async () => {
      // skip if the previous check is still in flight so results can't land out of order
      if (isChecking) {
        return;
      }
      isChecking = true;

      try {
        // check if user is signed in to the meeting associated with the active voting event
        const res = await fetch(`/api/attendance/meeting/${meetingId}`);

        if (!res.ok) {
          throw new Error('Failed to fetch meeting attendance');
        }

        const attendanceRecords: Array<{
          userId: string;
          status: string;
        }> = await res.json();

        const isPresent = attendanceRecords.some(
          (record) => record.userId === userId && record.status === 'PRESENT',
        );

        if (!isPresent) {
          if (!isCancelled) {
            setCanVoteInActiveEvent(false);
          }
          return;
        }

        // Check if user has already voted for this event
        const hasVotedRes = await fetch(
          `/api/voting-record/has-voted/${votingEventId}`,
        );

        if (!hasVotedRes.ok) {
          throw new Error('Failed to fetch voting records');
        }
        const hasAlreadyVoted = await hasVotedRes.json();

        if (!isCancelled) {
          setCanVoteInActiveEvent(!hasAlreadyVoted.hasVoted);
        }
        // nothing left to check once the member has voted
        if (hasAlreadyVoted.hasVoted) {
          window.clearInterval(intervalId);
        }
      } catch {
        // keep the current state on a failed re-check so a network blip doesn't close the pop-up
      } finally {
        isChecking = false;
      }
    };

    // keep re-checking so a member checked in after the vote opens still gets the pop-up
    intervalId = window.setInterval(checkMeetingSignInStatus, 3000);
    checkMeetingSignInStatus();

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userId, votingEventId, meetingId, dismissedVoteId]);

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
      {activeEvent && activeEvent.votingEventId === dismissedVoteId && (
        <div className='bg-[#C8102E] shadow-md px-4 sm:px-6 lg:px-8 py-3'>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <div className='w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0'>
                <Vote className='w-4 h-4 text-white' />
              </div>
              <p className='text-sm text-white truncate'>
                <span className='font-semibold'>A vote is open:</span>{' '}
                {activeEvent.name}
              </p>
            </div>
            <button
              type='button'
              onClick={() => setDismissedVoteId(null)}
              className='flex-shrink-0 px-4 py-2 text-sm font-medium text-[#C8102E] bg-white rounded-xl shadow-md hover:bg-gray-50 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white focus:ring-offset-[#C8102E]'
            >
              Vote now
            </button>
          </div>
        </div>
      )}
      <div className='flex flex-1'>
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className='flex-1 relative'>
          {renderContent()}
          {activeEvent &&
            canVoteInActiveEvent &&
            activeEvent.votingEventId !== dismissedVoteId && (
              <ActiveVotingModal
                event={activeEvent}
                onDismiss={() => setDismissedVoteId(activeEvent.votingEventId)}
              />
            )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
