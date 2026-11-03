'use client';
// eslint-disable-next-line
export const dynamic = 'force-dynamic';
import React, { createContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  UserRound,
} from 'lucide-react';

const defaultUser: User = {
  id: '',
  email: '',
  name: '',
  positions: [],
  capabilities: [],
};

export const UserContext = createContext(defaultUser);

const INPUT_CLASS =
  'block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors';
const BUTTON_CLASS =
  'group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#C8102E] hover:bg-[#A8102E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8102E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl';

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

/**
 * Sign-in goes through SGAuth, the SGA single sign-on. The first time someone
 * signs in without a portal profile, this asks for their NUID, which stays in
 * the portal and is never sent to SGAuth.
 */
const LoginPage: React.FC = () => {
  const {
    user,
    pendingRegistration,
    noAccess,
    login,
    logout,
    refresh,
    isLoading,
  } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    nuid: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace('/homepage');
  }, [user, router]);

  useEffect(() => {
    if (pendingRegistration) {
      setProfile((prev) => ({
        ...prev,
        ...splitName(pendingRegistration.name),
      }));
    }
  }, [pendingRegistration]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{9}$/.test(profile.nuid.trim())) {
      setError('NUID must be exactly 9 digits');
      return;
    }
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nuid: profile.nuid.trim(),
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error || 'Failed to create your profile');
        return;
      }
      await refresh();
    } catch {
      setError('Failed to create your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserContext.Provider value={user ?? defaultUser}>
      <div className='min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          <div className='text-center'>
            <h2 className='text-3xl font-bold text-gray-900 mb-2'>
              {pendingRegistration ? 'Join SGA' : 'Welcome'}
            </h2>
            <p className='text-gray-600 text-lg'>
              {pendingRegistration
                ? 'Finish setting up your SGA Dashboard profile'
                : 'Sign in to your SGA Dashboard'}
            </p>
          </div>

          <div className='bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700'>
            {isLoading || user ? (
              <div className='flex justify-center'>
                <LoaderCircle className='animate-spin h-6 w-6 text-white' />
              </div>
            ) : noAccess ? (
              <div className='space-y-6'>
                <p className='text-sm text-gray-300'>
                  Signed in as{' '}
                  <span className='font-semibold text-white'>
                    {noAccess.email}
                  </span>
                  , but none of your SGA positions use the SGA Dashboard. If
                  that is wrong, ask for your position to be updated in your SGA
                  account.
                </p>
                <button type='button' onClick={logout} className={BUTTON_CLASS}>
                  Sign out
                </button>
              </div>
            ) : pendingRegistration ? (
              <form className='space-y-6' onSubmit={handleRegister}>
                <p className='text-sm text-gray-300'>
                  Signed in as{' '}
                  <span className='font-semibold text-white'>
                    {pendingRegistration.email}
                  </span>
                  . Your NUID stays in the SGA Dashboard and is never shared
                  with your SGA account.
                </p>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {(
                    [
                      ['firstName', 'First Name', 'given-name'],
                      ['lastName', 'Last Name', 'family-name'],
                    ] as const
                  ).map(([name, label, autoComplete]) => (
                    <div key={name}>
                      <label
                        htmlFor={name}
                        className='block text-sm font-medium text-white mb-2'
                      >
                        {label}
                      </label>
                      <div className='relative'>
                        <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                          <UserRound className='h-5 w-5 text-gray-400' />
                        </div>
                        <input
                          id={name}
                          name={name}
                          type='text'
                          autoComplete={autoComplete}
                          required
                          className={INPUT_CLASS}
                          placeholder={label}
                          value={profile[name]}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <label
                    htmlFor='nuid'
                    className='block text-sm font-medium text-white mb-2'
                  >
                    NUID
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <CircleCheck className='h-5 w-5 text-gray-400' />
                    </div>
                    <input
                      id='nuid'
                      name='nuid'
                      type='text'
                      inputMode='numeric'
                      autoComplete='off'
                      required
                      className={INPUT_CLASS}
                      placeholder='9-digit NUID'
                      value={profile.nuid}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {error && (
                  <div className='bg-red-900 border border-red-700 rounded-xl p-4'>
                    <div className='flex'>
                      <CircleAlert className='h-5 w-5 text-red-400 flex-shrink-0' />
                      <p className='ml-3 text-sm text-red-200'>{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type='submit'
                  disabled={isSubmitting}
                  className={BUTTON_CLASS}
                >
                  {isSubmitting ? (
                    <div className='flex items-center'>
                      <LoaderCircle className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' />
                      Creating profile...
                    </div>
                  ) : (
                    'Create Profile'
                  )}
                </button>
                <button
                  type='button'
                  onClick={logout}
                  className='w-full text-sm text-gray-400 hover:text-white'
                >
                  Not you? Sign out
                </button>
              </form>
            ) : (
              <div className='space-y-6'>
                <button type='button' onClick={login} className={BUTTON_CLASS}>
                  Sign in with your SGA account
                </button>
                <p className='text-sm text-gray-400 text-center'>
                  Passwords and account details are managed in your SGA account.
                </p>
              </div>
            )}
          </div>

          <div className='text-center'>
            <p className='text-sm text-gray-500'>
              © 2026 Northeastern University Student Government Association. All
              rights reserved.
            </p>
          </div>
        </div>
      </div>
    </UserContext.Provider>
  );
};

export default LoginPage;
