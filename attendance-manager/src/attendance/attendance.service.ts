import { prisma } from '../lib/prisma';
import { AttendanceStatus, MeetingType } from '../generated/prisma';

function convertToAttendanceStatus(status: string): AttendanceStatus {
  switch (status) {
    case 'PRESENT':
      return AttendanceStatus.PRESENT;
    case 'EXCUSED_ABSENCE':
      return AttendanceStatus.EXCUSED_ABSENCE;
    case 'UNEXCUSED_ABSENCE':
      return AttendanceStatus.UNEXCUSED_ABSENCE;
    case 'PENDING':
      return AttendanceStatus.PENDING;
    default:
      throw new Error(`Invalid attendance status: ${status}`);
  }
}

function isAttendanceStatus(status: string): status is AttendanceStatus {
  return Object.values(AttendanceStatus).includes(status as AttendanceStatus);
}

export const AttendanceService = {
  // Get all attendance records for a user
  async getUserAttendance(userId: string) {
    return prisma.attendance.findMany({
      where: { userId },
      include: {
        meeting: true,
        request: true,
      },
    });
  },

  // Get all attendance records for a meeting
  async getMeetingAttendance(meetingId: string) {
    return prisma.attendance.findMany({
      where: { meetingId },
      include: {
        user: true,
        request: true,
      },
    });
  },

  // Update attendees for meeting
  async updateMeetingAttendees(meetingId: string, userIds: string[]) {
    return prisma.$transaction(async (transaction) => {
      await transaction.attendance.deleteMany({
        where: userIds.length
          ? { meetingId, userId: { notIn: userIds } }
          : { meetingId },
      });

      if (userIds.length === 0) return { count: 0 };

      return transaction.attendance.createMany({
        data: userIds.map((userId) => ({
          userId,
          meetingId,
          status: AttendanceStatus.PENDING,
        })),
        skipDuplicates: true,
      });
    });
  },

  async addMeetingAttendee(meetingId: string, userId: string) {
    return prisma.attendance.createMany({
      data: [
        {
          userId,
          meetingId,
          status: AttendanceStatus.PENDING,
        },
      ],
      skipDuplicates: true,
    });
  },

  // Create an attendance record
  async createAttendance(data: {
    userId: string;
    meetingId: string;
    status: AttendanceStatus;
  }) {
    return prisma.attendance.create({ data });
  },

  // Update attendance status
  async updateAttendance(
    attendanceId: string,
    data: { status?: AttendanceStatus },
  ) {
    return prisma.attendance.update({
      where: { attendanceId: attendanceId },
      data: {
        ...data,
      },
    });
  },

  async upsertAttendance(
    userId: string,
    meetingId: string,
    status: AttendanceStatus,
  ) {
    return prisma.attendance.upsert({
      where: {
        // eslint-disable-next-line
        userId_meetingId: { userId, meetingId },
      },
      update: {
        status,
      },
      create: {
        userId,
        meetingId,
        status,
      },
    });
  },

  // Delete an attendance record
  async deleteAttendance(attendanceId: string) {
    return prisma.attendance.delete({
      where: { attendanceId },
    });
  },

  // Get remaining unexcused absences for a user
  async getRemainingUnexcusedAbsences(userId: string) {
    const unexcusedAbsences = await prisma.attendance.findMany({
      where: {
        userId,
        status: AttendanceStatus.UNEXCUSED_ABSENCE,
      },
      include: {
        meeting: true,
      },
    });

    // Count unexcused absences by meeting type
    const regularCount = unexcusedAbsences.filter(
      (attendance) => attendance.meeting.type === MeetingType.REGULAR,
    ).length;
    const fullBodyCount = unexcusedAbsences.filter(
      (attendance) => attendance.meeting.type === MeetingType.FULL_BODY,
    ).length;

    // Allowed absences: 3 for regular, 1 for full-body
    const allowedRegular = 2;
    const allowedFullBody = 0;

    return {
      regular: {
        used: regularCount,
        allowed: allowedRegular,
        remaining: Math.max(0, allowedRegular - regularCount),
      },
      fullBody: {
        used: fullBodyCount,
        allowed: allowedFullBody,
        remaining: Math.max(0, allowedFullBody - fullBodyCount),
      },
    };
  },

  async updateAttendanceForUser(
    userId: string,
    attendanceId: string,
    status: string,
  ) {
    if (!isAttendanceStatus(status)) {
      throw new Error('Invalid attendance status: ' + status);
    }
    const attendanceRecord = await prisma.attendance.update({
      where: { attendanceId, userId },
      data: { status: convertToAttendanceStatus(status) },
    });
    if (!attendanceRecord) {
      throw new Error('Attendance record not found for this user');
    }
  },

  // Update attendance status based on request
  async updateAttendanceStatus(requestId: string, status: string) {
    if (!isAttendanceStatus(status)) {
      throw new Error('Invalid attendance status: ' + status);
    }

    const request = await prisma.request.findUnique({
      where: { requestId },
      include: { attendance: true },
    });

    if (!request || !request.attendance) {
      throw new Error('Request or related attendance record not found');
    }

    const attendanceRecord = await prisma.attendance.update({
      where: { attendanceId: request.attendance.attendanceId },
      data: { status: convertToAttendanceStatus(status) },
    });

    return attendanceRecord;
  },
};
