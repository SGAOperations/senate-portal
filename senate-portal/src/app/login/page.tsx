'use client';
// eslint-disable-next-line
export const dynamic = 'force-dynamic';
import LoginPage from '@/components/profile/LoginPage';
import { Suspense } from 'react';

export default function Login() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPage />
    </Suspense>
  );
}
