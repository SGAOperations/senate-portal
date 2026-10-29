'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { VotingEventApiData, VotingRecordApiData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { VoteType, yesNoOptions } from '@/utils/consts';
import { formatResultLabel } from './votingDisplayUtils';

interface EditVotingRecordsModalProps {
  votingEventId: string;
  onClose: () => void;
  onSaved: () => void;
}

function choiceOptionsForEvent(event: VotingEventApiData): string[] {
  if (event.voteType === VoteType.rollCall) {
    return Object.values(yesNoOptions);
  }
  if (event.options && event.options.length > 0) {
    return event.options;
  }
  return ['YES', 'NO', 'ABSTAIN'];
}

const EditVotingRecordsModal: React.FC<EditVotingRecordsModalProps> = ({
  votingEventId,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<VotingEventApiData | null>(null);
  const [rows, setRows] = useState<VotingRecordApiData[]>([]);
  const [initialResults, setInitialResults] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/voting-event/${votingEventId}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      setEvent(data);
      const list = (data.votingRecords || []).filter(
        (r: VotingRecordApiData) => !r.deletedAt,
      );
      setRows(list);
      const snap: Record<string, string> = {};
      list.forEach((r: VotingRecordApiData) => {
        snap[r.votingRecordId] = r.result;
      });
      setInitialResults(snap);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load voting event');
    } finally {
      setLoading(false);
    }
  }, [votingEventId]);

  useEffect(() => {
    load();
  }, [load]);

  const setRowResult = (votingRecordId: string, result: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.votingRecordId === votingRecordId ? { ...r, result } : r,
      ),
    );
  };

  const saveRow = async (row: VotingRecordApiData) => {
    const original = initialResults[row.votingRecordId];
    if (row.result === original) return;

    setSavingId(row.votingRecordId);
    setError(null);
    try {
      const res = await fetch(`/api/voting-record/${row.votingRecordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: row.result,
          ...(user?.id ? { updatedBy: user.id } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Update failed (${res.status})`);
      }
      setInitialResults((prev) => ({
        ...prev,
        [row.votingRecordId]: row.result,
      }));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSavingId(null);
    }
  };

  const displayName = (r: VotingRecordApiData) => {
    if (r.user?.firstName || r.user?.lastName) {
      return `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim();
    }
    return `User ${r.userId.slice(0, 8)}…`;
  };

  const choices = event ? choiceOptionsForEvent(event) : [];

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6'>
        <h3 className='mb-2 text-lg font-semibold text-gray-900'>
          Edit Voting Records
        </h3>
        <p className='mb-4 text-sm text-gray-600'>{event?.name ?? '…'}</p>

        {loading && <p className='text-sm text-gray-500'>Loading records…</p>}

        {!loading && error && (
          <p className='mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600'>
            {error}
          </p>
        )}

        {!loading && event && rows.length === 0 && (
          <p className='text-sm text-gray-500'>No votes recorded yet.</p>
        )}

        {!loading && rows.length > 0 && event && (
          <div className='max-h-96 overflow-y-auto rounded-lg border border-gray-300'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b border-gray-200 bg-gray-50'>
                  <th className='px-4 py-2 text-left font-medium text-gray-900'>
                    Voter
                  </th>
                  <th className='px-4 py-2 text-left font-medium text-gray-900'>
                    Vote
                  </th>
                  <th className='px-4 py-2 text-right font-medium text-gray-900'>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dirty =
                    row.result !== initialResults[row.votingRecordId];
                  const optionList = choices.includes(row.result)
                    ? choices
                    : [...choices, row.result];
                  return (
                    <tr
                      key={row.votingRecordId}
                      className='border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50'
                    >
                      <td className='px-4 py-3 align-middle text-gray-900'>
                        {displayName(row)}
                      </td>
                      <td className='px-4 py-3 align-middle'>
                        <select
                          value={row.result}
                          onChange={(e) =>
                            setRowResult(row.votingRecordId, e.target.value)
                          }
                          className='w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[#C8102E] focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:ring-offset-0'
                          disabled={savingId === row.votingRecordId}
                        >
                          {optionList.map((opt) => (
                            <option key={opt} value={opt}>
                              {formatResultLabel(opt)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className='px-4 py-3 text-right align-middle'>
                        <button
                          type='button'
                          disabled={!dirty || savingId === row.votingRecordId}
                          onClick={() => saveRow(row)}
                          className='rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A8102E] disabled:cursor-not-allowed disabled:opacity-60'
                        >
                          {savingId === row.votingRecordId
                            ? 'Saving…'
                            : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className='mt-6 flex space-x-3 border-t border-gray-200 pt-6'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVotingRecordsModal;
