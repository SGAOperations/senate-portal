import { RemainingAbsences } from '@/types';
import React from 'react';
import { Info } from 'lucide-react';

interface AbsencesBannerProps {
  bannerColor:
    | 'bg-blue-50 border-blue-200'
    | 'bg-red-50 border-red-200'
    | 'bg-yellow-50 border-yellow-200'
    | 'bg-green-50 border-green-200';
  remainingAbsences: RemainingAbsences;
}

const AbsencesBanner: React.FC<AbsencesBannerProps> = ({
  bannerColor,
  remainingAbsences,
}) => {
  return (
    <div className={`mb-6 rounded-lg border-2 p-4 ${bannerColor}`}>
      <div className='flex items-start'>
        <div className='flex-shrink-0'>
          <Info className='w-6 h-6 text-gray-600' />
        </div>
        <div className='ml-3 flex-1'>
          <h3 className='text-sm font-semibold text-gray-900 mb-2'>
            Remaining Unexcused Absences
          </h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <p className='text-sm text-gray-700'>
                <span className='font-medium'>Regular Meetings:</span>{' '}
                <span
                  className={`font-bold ${
                    remainingAbsences.regular.remaining === 0
                      ? 'text-red-600'
                      : remainingAbsences.regular.remaining <= 1
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                >
                  {remainingAbsences.regular.remaining}
                </span>{' '}
                remaining out of {remainingAbsences.regular.allowed} allowed (
                {remainingAbsences.regular.used} used)
              </p>
            </div>
            <div>
              <p className='text-sm text-gray-700'>
                <span className='font-medium'>Full-Body Meetings:</span>{' '}
                <span
                  className={`font-bold ${
                    remainingAbsences.fullBody.remaining === 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {remainingAbsences.fullBody.remaining}
                </span>{' '}
                remaining out of {remainingAbsences.fullBody.allowed} allowed (
                {remainingAbsences.fullBody.used} used)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsencesBanner;
