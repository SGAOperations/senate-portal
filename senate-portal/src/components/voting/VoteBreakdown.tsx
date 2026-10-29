import React from 'react';
import { VotingEventWithRelations } from '@/types';
import { yesNoOptions } from '@/utils/consts';
import { Vote } from 'lucide-react';

const optionRank = (o: string) =>
  o === 'Abstain' ? 2 : o === 'No Confidence' ? 1 : 0;

const optionColorClass = new Map([
  ['Yes', 'bg-vote-yes'],
  ['No', 'bg-vote-no'],
  ['Abstain', 'bg-vote-abstain'],
  ['No Confidence', 'bg-vote-no-confidence'],
]);
const FALLBACK_COLOR_CLASSES = [
  'bg-vote-f1',
  'bg-vote-f2',
  'bg-vote-f3',
  'bg-vote-f4',
  'bg-vote-f5',
];

const getOptionColorClass = (opt: string, idx: number): string =>
  optionColorClass.get(opt) ??
  FALLBACK_COLOR_CLASSES[idx % FALLBACK_COLOR_CLASSES.length];

interface VoteBreakdownProps {
  event: VotingEventWithRelations;
  eligible: number;
  voteCounts: Record<string, number>;
  totalVotes: number;
}

const VoteBreakdown: React.FC<VoteBreakdownProps> = ({
  event,
  eligible,
  voteCounts,
  totalVotes,
}) => {
  const opts =
    event.options.length > 0
      ? [...event.options].sort((a, b) => optionRank(a) - optionRank(b))
      : Object.values(yesNoOptions);

  if (opts.length === 0) return null;

  const participationPct =
    eligible > 0
      ? Math.round((Math.min(totalVotes, eligible) / eligible) * 100)
      : null;

  return (
    <div className='mt-4 pt-4 border-t border-gray-200'>
      <div className='flex items-center gap-1.5 text-primary font-medium mb-3'>
        <Vote className='h-4 w-4 shrink-0' />
        <span>
          {totalVotes}/{eligible > 0 ? eligible : '—'} votes
          {participationPct !== null && ` (${participationPct}%)`}
        </span>
      </div>
      {totalVotes > 0 && (
        <div className='h-10 w-full rounded-xl overflow-hidden flex'>
          {opts.map((opt, idx) => {
            const count = voteCounts[opt] ?? 0;
            const barPct = Math.round((count / totalVotes) * 100);
            return (
              <div
                key={opt}
                className={`h-full flex items-center justify-center overflow-hidden transition-all duration-500 ${getOptionColorClass(opt, idx)}`}
                style={{ width: `${barPct}%` }}
                title={`${opt}: ${count} (${barPct}%)`}
              >
                {barPct >= 8 && (
                  <span className='text-sm font-medium text-gray-800 whitespace-nowrap px-2 truncate'>
                    {opt} · {count} · {barPct}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VoteBreakdown;
