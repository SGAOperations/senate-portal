import { z } from 'zod';

// Zod schemas: used for request validation and by next-openapi-gen for the API docs.
// They reference each other (User <-> Attendance <-> Request), so keep them in one file.

// Enums
export const AttendanceStatus = z.enum([
  'PRESENT',
  'UNEXCUSED_ABSENCE',
  'EXCUSED_ABSENCE',
  'PENDING',
]);
export const AttendanceMode = z.enum(['ONLINE', 'IN_PERSON', 'ABSENT']);
export const TimeAdjustment = z
  .enum(['ARRIVING_LATE', 'LEAVING_EARLY'])
  .optional();
export const MeetingTypeEnum = z.enum(['REGULAR', 'FULL_BODY']);
export const RoleTypeEnum = z.enum(['EBOARD', 'MEMBER']);

// Northeastern ID: exactly 9 digits, kept as a string so leading zeros survive.
export const Nuid = z
  .string()
  .regex(/^\d{9}$/, 'NUID must be exactly 9 digits')
  .describe('NUID (9 digits)');

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
    createdAt: z.date().describe('Creation timestamp'),
    deletedAt: z.date().nullable().describe('Deletion timestamp, if deleted'),
    attendance: z.array(AttendanceSchema).describe('Attendances'),
  }),
);

// Request body for POST /api/auth/signup
export const SignupSchema = z.object({
  email: z.email('Invalid email address').describe('Email address'),
  password: z.string().min(1).describe('Password (sent to Supabase only)'),
  firstName: z.string().min(1).describe('First name'),
  lastName: z.string().min(1).describe('Last name'),
  nuid: Nuid,
});

// Request body for POST /api/users
export const CreateUserSchema = z.object({
  userId: z.string().min(1).describe('User ID'),
  nuid: Nuid,
  email: z.email().describe('Email address'),
  firstName: z.string().min(1).describe('First name'),
  lastName: z.string().min(1).describe('Last name'),
});

// Request body for PUT /api/users/:id. Only these fields can be changed;
// anything else in the body (supabaseAuthId, deletedAt, userId, ...) is dropped.
export const UpdateUserSchema = CreateUserSchema.omit({ userId: true })
  .extend({ roleId: z.string().min(1).describe('Role ID') })
  .partial();

// Request body for POST /api/users/role
export const CreateRoleSchema = z.object({
  roleType: RoleTypeEnum.describe('Role Type'),
});

// Request schema
export const RequestSchema: z.ZodType<any> = z.lazy(
  (): z.ZodObject<any> =>
    z.object({
      attendanceId: z.string().describe('Attendance ID'),
      requestId: z.string().describe('Request ID'),
      reason: z.string().describe('Reason for request'),
      attendanceMode: AttendanceMode.describe(
        'Attendance mode: online, in-person, or absent',
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

// Request body for POST /api/meeting
export const CreateMeetingSchema = z.object({
  name: z.string().min(1).describe('Meeting Name'),
  date: z.string().min(1).describe('Meeting Date'),
  startTime: z.string().min(1).describe('Meeting Start Time'),
  endTime: z.string().min(1).describe('Meeting End Time'),
  notes: z.string().default('').describe('Meeting Notes'),
  type: MeetingTypeEnum.describe('Meeting Type'),
  attendeeIds: z
    .array(z.string())
    .default([])
    .describe('User IDs to create attendance records for'),
});

export type CreateMeetingInput = z.infer<typeof CreateMeetingSchema>;

// Request body for PUT /api/meeting/:id. Every field is optional, and notes
// has no default so an update that leaves it out doesn't wipe the existing notes.
export const UpdateMeetingSchema = CreateMeetingSchema.omit({
  attendeeIds: true,
})
  .partial()
  .extend({
    notes: z.string().optional().describe('Meeting Notes'),
  });

export type UpdateMeetingInput = z.infer<typeof UpdateMeetingSchema>;

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
    'Attendance Mode, online, in-person, or absent',
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
    'Attendance Mode, online, in-person, or absent',
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
        'Attendance mode: online, in-person, or absent',
      ),
      isLate: z.boolean().describe('Whether the user was late'),
      timeAdjustment: TimeAdjustment.describe(
        'Time adjustment, if any',
      ).nullable(),
      attendance: AttendanceSchema.describe('Attendance'),
    }),
  )
  .describe('Array of requests for a specified user');
