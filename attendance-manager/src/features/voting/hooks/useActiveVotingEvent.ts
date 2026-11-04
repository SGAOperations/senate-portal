import { useCallback, useEffect, useState } from 'react';
import { VotingEventWithRelations } from '@/types';

interface UseActiveVotingEventOptions {
  pollIntervalMs?: number;
}

interface UseActiveVotingEventResult {
  activeEvents: VotingEventWithRelations[];
  activeEvent: VotingEventWithRelations | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Polls the backend for currently active voting events.
 * "active" is defined as VotingEvents with deletedAt === null and endedAt === null.
 */
export function useActiveVotingEvent(
  options: UseActiveVotingEventOptions = {},
): UseActiveVotingEventResult {
  const { pollIntervalMs = 3000 } = options;
  const [activeEvents, setActiveEvents] = useState<VotingEventWithRelations[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveEvents = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/voting-event/active');
      if (!res.ok) {
        setError('Failed to load active voting events.');
        return;
      }
      const events: VotingEventWithRelations[] = await res.json();

      const sorted = [...events].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setActiveEvents(sorted);
    } catch {
      setError('Failed to load active voting events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveEvents();

    const id = window.setInterval(fetchActiveEvents, pollIntervalMs);

    return () => {
      window.clearInterval(id);
    };
  }, [fetchActiveEvents, pollIntervalMs]);

  return {
    activeEvents,
    activeEvent: activeEvents[0] ?? null,
    loading,
    error,
    refresh: fetchActiveEvents,
  };
}
