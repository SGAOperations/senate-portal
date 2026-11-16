import type { MeetingApiData } from './meeting';
import type { UserData } from './user';

export interface AttendanceRecord {
  id: string;
  meetingId: string;
  meetingTitle: string;
  meetingDescription: string;
  date: Date;
  time: string;
  totalMembers: number;
  attendedMembers: number;
  attendanceRate: number;
}

export interface AttendanceApiData {
  attendanceId: string;
  userId: string;
  meetingId: string;
  status: string;
  meeting: MeetingApiData;
  user: UserData;
}

export interface RemainingAbsences {
  regular: {
    used: number;
    allowed: number;
    remaining: number;
  };
  fullBody: {
    used: number;
    allowed: number;
    remaining: number;
  };
}
