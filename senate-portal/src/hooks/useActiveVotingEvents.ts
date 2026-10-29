import { useCallback, useEffect, useState } from 'react';
import { VotingEventWithRelations } from '@/types';

interface UseActiveVotingEventsOptions {
  pollIntervalMs?: number;
}

interface UseActiveVotingEventsResult {
  events: VotingEventWithRelations[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Polls GET /api/voting-event/active (VotingService.getActiveVotingEvents)
export function useActiveVotingEvents(
  options: UseActiveVotingEventsOptions = {},
): UseActiveVotingEventsResult {
  const { pollIntervalMs = 3000 } = options;
  const [events, setEvents] = useState<VotingEventWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/voting-event/active');
      if (!res.ok) {
        throw new Error(`Failed to fetch active voting events (${res.status})`);
      }
      const data: VotingEventWithRelations[] = await res.json();
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setEvents(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => {
      window.clearInterval(id);
    };
  }, [refresh, pollIntervalMs]);

  return { events, loading, error, refresh };
}
