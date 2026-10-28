import React, { useCallback, useEffect, useState } from 'react';
import { MeetingApiData, VotingEventWithRelations } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import VotingAdminPanel from '@/components/voting/VotingAdminPanel';
import VotingResultsPanel from '@/components/voting/VotingResultsPanel';
import DeleteVotingModal from '@/components/voting/DeleteVotingModal';

const VotingPage: React.FC = () => {
  const [meetings, setMeetings] = useState<MeetingApiData[]>([]);
  const [events, setEvents] = useState<VotingEventWithRelations[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [deleteEvent, setDeleteEvent] =
    useState<VotingEventWithRelations | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { user } = useAuth();
  const isEboard = user?.role === 'EBOARD';

  const loadMeetingsAndEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const [meetingsRes, eventsRes] = await Promise.all([
        fetch('/api/meeting/upcoming'),
        fetch('/api/voting-event'),
      ]);

      if (meetingsRes.ok) {
        const meetingsData: MeetingApiData[] = await meetingsRes.json();
        setMeetings(meetingsData);
      }

      if (eventsRes.ok) {
        const eventsData: VotingEventWithRelations[] = await eventsRes.json();
        setEvents(eventsData);
      }
    } catch (error) {
      globalThis.console?.error('Failed to load meetings and events', error);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeetingsAndEvents();
  }, [loadMeetingsAndEvents]);

  const handleDeleteVotingEvent = async (votingEventId?: string | null) => {
    if (!votingEventId) return;
    try {
      setDeleteLoading(true);

      const res = await fetch(`/api/voting-event/${votingEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(err.error || 'Failed to delete voting event');
      }

      await loadMeetingsAndEvents();
    } catch (err) {
      globalThis.console?.error('Failed to delete voting event', err);
      alert('Failed to delete voting event.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className='flex-1 p-6 bg-gray-50'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Voting</h1>
        <p className='text-gray-600 mt-1'>
          Create and manage voting events. When a vote is active, all users will
          see a modal to submit their vote.
        </p>
      </div>
      <VotingAdminPanel
        meetings={meetings}
        onVotingEventsMutated={loadMeetingsAndEvents}
      />
      <VotingResultsPanel
        events={events}
        loading={eventsLoading}
        setDeleteEvent={setDeleteEvent}
        canDelete={isEboard}
      />

      {deleteEvent && isEboard && (
        <DeleteVotingModal
          deleteEvent={deleteEvent}
          onDeleteEvent={handleDeleteVotingEvent}
          setDeleteEvent={setDeleteEvent}
          deleteLoading={deleteLoading}
        />
      )}
    </div>
  );
};

export default VotingPage;
