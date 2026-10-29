'use client';
import Layout from '@/components/layout/Layout';
import { Suspense } from 'react';

export default function Homepage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Layout />
    </Suspense>
  );
}
