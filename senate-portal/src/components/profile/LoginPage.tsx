'use client';
// eslint-disable-next-line
export const dynamic = 'force-dynamic';
import React, { createContext, useEffect, useState } from 'react';
import { User, LoginCredentials } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  AtSign,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const defaultUser: User = {
  id: '',
  email: '',
  name: '',
  role: 'MEMBER',
};

export const UserContext = createContext(defaultUser);

interface SignupCredentials {
  firstName: string;
  lastName: string;
  email: string;
  nuid: string;
  password: string;
  confirmPassword: string;
}

const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  // eslint-disable-next-line
  const [user, _setUser] = useState<User>({
    id: '',
    email: '',
    name: '',
    role: 'MEMBER',
  });
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isPasswordResetMode, setIsPasswordResetMode] = useState(false);
  const [isPasswordResetRequestMode, setIsPasswordResetRequestMode] =
    useState(false);
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [signupCredentials, setSignupCredentials] = useState<SignupCredentials>(
    {
      firstName: '',
      lastName: '',
      email: '',
      nuid: '',
      password: '',
      confirmPassword: '',
    },
  );
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isPasswordResetMode) {
      if (!signupCredentials.password || !signupCredentials.confirmPassword) {
        setError('Please enter a new password');
        return;
      }

      if (signupCredentials.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (signupCredentials.password !== signupCredentials.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      try {
        const { error } = await supabase.auth.updateUser({
          password: signupCredentials.password,
        });

        if (error) {
          setError(error.message);
          return;
        }
        alert('Password updated successfully!');
        setIsPasswordResetMode(false);
      } catch {
        setError('Failed to update password');
      }
      return;
    }
    if (isPasswordResetRequestMode) {
      if (!credentials.email) {
        setError('Please fill in all fields');
        return;
      }

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(
          credentials.email,
          {
            redirectTo: `${window.location.origin}/login?mode=reset`,
          },
        );

        if (error) {
          setError(error.message);
          return;
        }

        alert('If an account exists, a reset email has been sent.');
        setIsPasswordResetRequestMode(false);
      } catch {
        setError('Something went wrong. Please try again.');
      }

      return;
    }

    if (isLoginMode) {
      // Login logic
      if (!credentials.email || !credentials.password) {
        setError('Please fill in all fields');
        return;
      }

      try {
        if (!isPasswordResetMode) {
          await login(credentials);
        }
      } catch (error) {
        setError('Login failed. Please try again.\n Error msg: ' + error);
      }
    } else {
      if (
        !signupCredentials.firstName ||
        !signupCredentials.lastName ||
        !signupCredentials.email ||
        !signupCredentials.password ||
        !signupCredentials.confirmPassword
      ) {
        setError('Please fill in all fields');
        return;
      }

      if (signupCredentials.password !== signupCredentials.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (signupCredentials.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      try {
        // eslint-disable-next-line
        const { confirmPassword: _confirmPassword, ...safeCredentials } =
          signupCredentials;
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...safeCredentials,
            // roleId will default to MEMBER in signup route
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(`Signup failed. ${errorData.error}`);
          return;
        }
        // eslint-disable-next-line
        const result = await response.json();
        alert(
          `Welcome ${signupCredentials.firstName} ${signupCredentials.lastName}! Check your email for a verification link.`,
        );
        setIsLoginMode(true);
        resetForms();
      } catch {
        setError('Invalid email or password');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isLoginMode && !isPasswordResetMode) {
      setCredentials((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setSignupCredentials((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  useEffect(() => {
    const mode = searchParams.get('mode');

    if (mode === 'reset') {
      setIsPasswordResetMode(true);
    } else {
      setIsPasswordResetMode(false);
    }
  }, [searchParams]);

  const resetForms = () => {
    setError('');
    setCredentials({ email: '', password: '' });
    setSignupCredentials({
      firstName: '',
      lastName: '',
      email: '',
      nuid: '',
      password: '',
      confirmPassword: '',
    });
  };

  const handleModeChange = (isLogin: boolean) => {
    setIsLoginMode(isLogin);
    resetForms();
  };

  return (
    <UserContext.Provider value={user}>
      <div className='min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-md w-full space-y-8'>
          {/* Toggle Switch */}
          <div className='flex justify-center'>
            <div className='flex items-center space-x-4 bg-gray-100 rounded-full p-1'>
              <button
                onClick={() => handleModeChange(true)}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  isLoginMode
                    ? 'bg-[#C8102E] text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => handleModeChange(false)}
                className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  !isLoginMode
                    ? 'bg-[#C8102E] text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Header Section */}
          <div className='text-center'>
            <h2 className='text-3xl font-bold text-gray-900 mb-2'>
              {isLoginMode ? 'Welcome Back' : 'Join SGA'}
            </h2>
            <p className='text-gray-600 text-lg'>
              {isLoginMode
                ? 'Sign in to your SGA Dashboard'
                : 'Create your SGA Dashboard account'}
            </p>
          </div>

          {/* Form */}
          <div className='bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700'>
            <form className='space-y-6' onSubmit={handleSubmit}>
              {/* Name fields - only for signup */}
              {!isLoginMode && (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label
                      htmlFor='firstName'
                      className='block text-sm font-medium text-white mb-2'
                    >
                      First Name
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <UserRound className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        id='firstName'
                        name='firstName'
                        type='text'
                        autoComplete='given-name'
                        required={!isLoginMode}
                        className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                        placeholder='First name'
                        value={signupCredentials.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor='lastName'
                      className='block text-sm font-medium text-white mb-2'
                    >
                      Last Name
                    </label>
                    <div className='relative'>
                      <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                        <UserRound className='h-5 w-5 text-gray-400' />
                      </div>
                      <input
                        id='lastName'
                        name='lastName'
                        type='text'
                        autoComplete='family-name'
                        required={!isLoginMode}
                        className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                        placeholder='Last name'
                        value={signupCredentials.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email field */}
              {!isPasswordResetMode && (
                <div>
                  <label
                    htmlFor='email'
                    className='block text-sm font-medium text-white mb-2'
                  >
                    Email Address
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <AtSign className='h-5 w-5 text-gray-400' />
                    </div>
                    <input
                      id='email'
                      name='email'
                      type='email'
                      autoComplete='email'
                      required
                      className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                      placeholder='Enter your email'
                      value={
                        isLoginMode && !isPasswordResetMode
                          ? credentials.email
                          : signupCredentials.email
                      }
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {!isLoginMode && (
                <div>
                  <label
                    htmlFor='confirmPassword'
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
                      autoComplete='off'
                      required={!isLoginMode}
                      className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                      placeholder='NUID'
                      value={signupCredentials.nuid}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {/* Password field */}
              {!isPasswordResetRequestMode && (
                <div>
                  <label
                    htmlFor='password'
                    className='block text-sm font-medium text-white mb-2'
                  >
                    Password
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <LockKeyhole className='h-5 w-5 text-gray-400' />
                    </div>
                    <input
                      id='password'
                      name='password'
                      type='password'
                      autoComplete={
                        isLoginMode ? 'current-password' : 'new-password'
                      }
                      required
                      className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                      placeholder={
                        isLoginMode
                          ? 'Enter your password'
                          : 'Create a password'
                      }
                      value={
                        isLoginMode && !isPasswordResetMode
                          ? credentials.password
                          : signupCredentials.password
                      }
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {/* Confirm Password field - only for signup */}
              {(!isLoginMode || isPasswordResetMode) && (
                <div>
                  <label
                    htmlFor='confirmPassword'
                    className='block text-sm font-medium text-white mb-2'
                  >
                    Confirm Password
                  </label>
                  <div className='relative'>
                    <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                      <CircleCheck className='h-5 w-5 text-gray-400' />
                    </div>
                    <input
                      id='confirmPassword'
                      name='confirmPassword'
                      type='password'
                      autoComplete='new-password'
                      required={!isLoginMode}
                      className='block w-full pl-10 pr-3 py-3 border border-gray-600 rounded-xl text-white bg-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C8102E] focus:border-[#C8102E] transition-colors'
                      placeholder='Confirm your password'
                      value={
                        isLoginMode && !isPasswordResetMode
                          ? credentials.password
                          : signupCredentials.confirmPassword
                      }
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}

              {isLoginMode && (
                <div>
                  <label
                    htmlFor='password'
                    className='block text-sm font-medium text-white mb-2 flex items-center justify-center'
                    style={{ cursor: 'pointer' }}
                    onClick={() =>
                      setIsPasswordResetRequestMode((prev) => !prev)
                    }
                  >
                    {isPasswordResetRequestMode
                      ? 'Exit Password Reset Mode'
                      : 'Forgot your password? Click Here to Reset'}
                  </label>
                </div>
              )}

              {error && (
                <div className='bg-red-900 border border-red-700 rounded-xl p-4'>
                  <div className='flex'>
                    <div className='flex-shrink-0'>
                      <CircleAlert className='h-5 w-5 text-red-400' />
                    </div>
                    <div className='ml-3'>
                      <p className='text-sm text-red-200'>{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type='submit'
                  disabled={isLoading}
                  className='group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-[#C8102E] hover:bg-[#A8102E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C8102E] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl'
                >
                  {isLoading ? (
                    <div className='flex items-center'>
                      <LoaderCircle className='animate-spin -ml-1 mr-3 h-5 w-5 text-white' />
                      {isLoginMode ? 'Signing in...' : 'Creating account...'}
                    </div>
                  ) : isPasswordResetRequestMode || isPasswordResetMode ? (
                    'Reset Password'
                  ) : isLoginMode ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>

              <div className='text-center'>
                <p className='text-sm text-gray-400'>
                  Password must be at least 6 characters long
                </p>
              </div>
            </form>
          </div>

          {/* Footer */}
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
