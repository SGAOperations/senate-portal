import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/providers/AuthContext';
import { SemesterProvider } from '@/providers/SemesterContext';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'SGA Dashboard',
  description: 'Student Government Association Attendance Management System',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          <SemesterProvider>{children}</SemesterProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
