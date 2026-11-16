import type { AttendanceApiData } from './attendance';

export type MeetingType = 'FULL_BODY' | 'REGULAR';

// MeetingApiData is declared twice; TypeScript merges both declarations into
// one interface. Merging only works within a single module, so keep them here.
export interface MeetingApiData {
  meetingId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  type: MeetingType;
  semesterId: string;
  attendance: AttendanceApiData[];
  eligibleCount?: number;
}

// eslint-disable-next-line no-redeclare
export interface MeetingApiData {
  meetingId: string;
  date: string;
  startTime: string;
  endTime: string;
  name: string;
  notes: string;
  totalMembers: number;
  attendedMembers: number;
  percentage: number;
}
