import type { AttendanceApiData } from './attendance';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'EBOARD';
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextType {
  user: User | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface RoleData {
  roleId: string;
  roleType: string;
}

export interface UserData {
  userId: string;
  nuid: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleData;
  password: string;
}

export interface UserApiData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  nuid: string;
  attendance: AttendanceApiData[];
  attendanceId?: string;
  role: RoleData;
}
