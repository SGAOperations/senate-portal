import { z } from 'zod';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'MEMBER' | 'EBOARD';
  avatar?: string;
}

export interface MeetingApiData {
  meetingId: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  type: MeetingType;
  attendance: AttendanceApiData[];
  eligibleCount?: number;
}

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

export type MeetingType = 'FULL_BODY' | 'REGULAR';

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

export interface AttendanceApiData {
  attendanceId: string;
  userId: string;
  meetingId: string;
  status: string;
  meeting: MeetingApiData;
  user: UserData;
}

export interface RequestApiData {
  requestId: string;
  attendanceId: string;
  reason: string;
  attendanceMode: 'ONLINE' | 'IN_PERSON';
  timeAdjustment: 'ARRIVING_LATE' | 'LEAVING_EARLY';
  attendance: AttendanceApiData;
  isLate: boolean;
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

export interface RequestForm {
  selectedMeetings: string[];
  requestTypes: {
    leavingEarly: boolean;
    comingLate: boolean;
    goingOnline: boolean;
  };
  explanation: string;
}

// Voting

export interface VotingRecordApiData {
  votingRecordId: string;
  votingEventId: string;
  userId: string;
  result: string;
  user?: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface VotingEventApiData {
  votingEventId: string;
  meetingId: string;
  name: string;
  voteType: string;
  notes?: string | null;
  options: string[];
  createdAt: string;
  updatedAt?: string | null;
  endedAt?: string | null;
  deletedAt?: string | null;
  resultCounts?: Record<string, number>;
  votePassed?: boolean | null;
  secretBallotOutcomeKind?: 'tie' | 'motion_pass_fail' | 'option_winner' | null;
  winningResult?: string | null;
}

export type VotingEventWithRelations = VotingEventApiData & {
  meeting?: {
    name: string;
    date: string;
  };
  votingRecords?: VotingRecordApiData[];
};

// Swagger Docs Types

// Enums
export const AttendanceStatus = z.enum([
  'PRESENT',
  'UNEXCUSED_ABSENCE',
  'EXCUSED_ABSENCE',
  'PENDING',
]);
export const AttendanceMode = z.enum(['ONLINE', 'IN_PERSON']);
export const TimeAdjustment = z
  .enum(['ARRIVING_LATE', 'LEAVING_EARLY'])
  .optional();
export const MeetingTypeEnum = z.enum(['REGULAR', 'FULL_BODY']);

// Schemas
export const RoleSchema = z.object({
  roleId: z.string().describe('Role ID'),
  roleType: z.string().describe('Role Type'),
});

// User schema
export const UserSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    userId: z.string().describe('User ID'),
    role: RoleSchema.describe('Role'),
    supabaseAuthId: z.string().nullable().describe('Supabase Auth ID'),
    nuid: z.string().describe('NUID'),
    email: z.string().describe('Email address'),
    firstName: z.string().describe('First name'),
    lastName: z.string().describe('Last name'),
    password: z.string().nullable().describe('Password'),
    createdAt: z.date().describe('Creation timestamp'),
    updatedAt: z.date().describe('Last updated timestamp'),
    deletedAt: z.date().nullable().describe('Deletion timestamp, if deleted'),
    attendance: z.array(AttendanceSchema).describe('Attendances'),
  }),
);

// Request schema
export const RequestSchema: z.ZodType<any> = z.lazy(
  (): z.ZodObject<any> =>
    z.object({
      attendanceId: z.string().describe('Attendance ID'),
      requestId: z.string().describe('Request ID'),
      reason: z.string().describe('Reason for request'),
      attendanceMode: AttendanceMode.describe(
        'Attendance mode: online or in-person',
      ),
      isLate: z.boolean().describe('Whether the user was late'),
      timeAdjustment: TimeAdjustment.describe(
        'Time adjustment, if any',
      ).nullable(),
      attendance: AttendanceSchema.describe('Attendance'),
    }),
);

// Attendance schema
export const AttendanceSchema = z.object({
  attendanceId: z.string().describe('Attendance ID'),
  userId: z.string().describe('User ID'),
  meetingId: z.string().describe('Meeting ID'),
  status: AttendanceStatus.describe('Attendance status'),
  user: UserSchema.describe('User information'),
  request: RequestSchema.describe('Optional attendance request'),
});

// Meeting Schema
export const MeetingSchema = z.object({
  meetingId: z.string().describe('Meeting ID'),
  name: z.string().describe('Meeting Name'),
  date: z.string().describe('Meeting Date'),
  startTime: z.string().describe('Meeting Start Time'),
  endTime: z.string().describe('Meeting End Time'),
  type: MeetingTypeEnum.describe('Meeting Type'),
  attendance: z.array(AttendanceSchema).describe('Attendances'),
});

export const AttendanceParams = z.object({
  attendanceId: z.string().describe('Attendance Id'),
});

export const AttendanceResponse = z.object({
  attendanceId: z.string().describe('Attendance Id'),
  userId: z.string().describe('User Id'),
  meetingId: z.string().describe('Meeting Id'),
  status: AttendanceStatus.describe('Status of the attendance'),
});

export const PostAttendanceParams = z.object({
  userId: z.string().describe('User Id'),
  meetingId: z.string().describe('Meeting Id'),
  status: AttendanceStatus.describe('Status of the attendance'),
});

export const UpdateAttendanceRequestParams = z.object({
  requestId: z.string().describe('Request Id'),
  status: AttendanceStatus.describe('Status of the attendance'),
});

export const CreateAttendanceRequestParams = z.object({
  attendanceId: z.string().describe('Attendance Id'),
  reason: z.string().describe('Reason for the request'),
  attendanceMode: AttendanceMode.describe(
    'Attendance Mode, online or in-person',
  ),
  timeAdjustment: TimeAdjustment.describe(
    'Time Adjustment, arriving late or leaving early',
  ),
});

export const CreateAttendanceRequestResponse = z.object({
  attendanceId: z.string().describe('Attendance Id'),
  requestId: z.string().describe('Request Id'),
  reason: z.string().describe('Reason for the request'),
  attendanceMode: AttendanceMode.describe(
    'Attendance Mode, online or in-person',
  ),
  timeAdjustment: TimeAdjustment.describe(
    'Time Adjustment, arriving late or leaving early',
  ),
  isLate: z.boolean().describe('Is Late'),
});

export const GetAttendanceMeetingParams = z.object({
  meetingId: z.string().describe('Meeting Id'),
});

export const GetMeetingAttendanceResponse = z
  .array(AttendanceSchema)
  .describe('Array of attendance records for a specific meeting');

export const GetUserAttendanceParams = z.object({
  userId: z.string().describe('User Id'),
});

export const GetUserAttendanceResponse = z
  .array(AttendanceSchema)
  .describe('Array of attendance records for a specific user');

export const GetRemainingAbscencesResponse = z.object({
  regular: z.object({
    used: z.number().describe('Number of regular absences used'),
    allowed: z.number().describe('Number of regular absences allowed'),
    remaining: z.number().describe('Number of regular absences remaining'),
  }),
  fullBody: z.object({
    used: z.number().describe('Number of full body absences used'),
    allowed: z.number().describe('Number of full body absences allowed'),
    remaining: z.number().describe('Number of full body absences remaining'),
  }),
});

export const GetUserRequestsResponse = z
  .array(
    z.object({
      attendanceId: z.string().describe('Attendance ID'),
      requestId: z.string().describe('Request ID'),
      reason: z.string().describe('Reason for request'),
      attendanceMode: AttendanceMode.describe(
        'Attendance mode: online or in-person',
      ),
      isLate: z.boolean().describe('Whether the user was late'),
      timeAdjustment: TimeAdjustment.describe(
        'Time adjustment, if any',
      ).nullable(),
      attendance: AttendanceSchema.describe('Attendance'),
    }),
  )
  .describe('Array of requests for a specified user');
