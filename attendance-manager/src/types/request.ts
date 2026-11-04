import type { AttendanceApiData } from './attendance';

export interface RequestApiData {
  requestId: string;
  attendanceId: string;
  reason: string;
  attendanceMode: 'ONLINE' | 'IN_PERSON' | 'ABSENT';
  timeAdjustment: 'ARRIVING_LATE' | 'LEAVING_EARLY';
  attendance: AttendanceApiData;
  isLate: boolean;
}

export interface RequestForm {
  selectedMeetings: string[];
  requestTypes: {
    leavingEarly: boolean;
    comingLate: boolean;
    goingOnline: boolean;
    notAttending: boolean;
  };
  explanation: string;
}
