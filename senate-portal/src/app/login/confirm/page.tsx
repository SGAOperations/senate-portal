'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

function ConfirmContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');

  let isValidUrl = false;
  let isRecovery = false;
  try {
    const parsed = new URL(url ?? '');
    isValidUrl = parsed.hostname.endsWith('.supabase.co');
    isRecovery = parsed.searchParams.get('type') === 'recovery';
  } catch {
    // invalid or missing URL — leave defaults
  }

  return (
    <div className='min-h-screen bg-white flex items-center justify-center px-4'>
      <div className='max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700 text-center space-y-4'>
        {isValidUrl ? (
          <>
            <CircleCheck className='h-12 w-12 text-green-400 mx-auto' />
            <h2 className='text-3xl font-bold text-white'>
              {isRecovery ? 'Reset Your Password' : 'Confirm Your Email'}
            </h2>
            <p className='text-gray-300 text-sm'>
              {isRecovery
                ? 'Your password reset link is ready.'
                : 'Your verification link is ready.'}{' '}
              Press the button below to proceed — do not share this page with
              anyone.
            </p>
            <a
              href={url ?? ''}
              className='block w-full py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 shadow-lg hover:shadow-xl'
            >
              {isRecovery ? 'Reset Password' : 'Confirm Email'}
            </a>
          </>
        ) : (
          <>
            <CircleAlert className='h-12 w-12 text-red-400 mx-auto' />
            <h2 className='text-xl font-bold text-white'>
              Invalid confirmation link
            </h2>
            <p className='text-gray-400 text-sm'>
              This link is missing or invalid. Please request a new one.
            </p>
          </>
        )}
        <p className='text-sm text-gray-500'>
          © 2026 Northeastern University Student Government Association. All
          rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConfirmContent />
    </Suspense>
  );
}
