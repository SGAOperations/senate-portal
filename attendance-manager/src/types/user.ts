import type { Capability } from '@/lib/permissions';
import type { AttendanceApiData } from './attendance';

export type { Capability };

export interface User {
  // Portal profile id; null for staff whose positions need no profile.
  id: string | null;
  email: string;
  name: string;
  // SGAuth position names, for display.
  positions: string[];
  // What their SGAuth positions let them do (src/lib/permissions.ts). The
  // server checks every one again; this only decides what to show.
  capabilities: Capability[];
  avatar?: string;
}

export function userCan(
  user: User | null | undefined,
  capability: Capability,
): boolean {
  return user?.capabilities.includes(capability) ?? false;
}

// Signed in to SGAuth, but no portal profile yet: they still owe an NUID.
export interface PendingRegistration {
  email: string;
  name: string;
}

export interface AuthContextType {
  user: User | null;
  pendingRegistration: PendingRegistration | null;
  // Signed in to SGAuth, but no position gives them access to the portal.
  noAccess: PendingRegistration | null;
  login: () => void;
  logout: () => void;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

export interface UserData {
  userId: string;
  nuid: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserApiData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  nuid: string;
  attendance: AttendanceApiData[];
  attendanceId?: string;
  // Holds a Senate seat (from /api/users); otherwise an officer on the roster
  isSenator?: boolean;
}
