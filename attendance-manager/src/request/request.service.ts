import { prisma } from '../lib/prisma';
import { AttendanceMode, TimeAdjustment } from '../generated/prisma';
import { isMeetingRequestLate } from '../utils/meeting-time';

export const RequestService = {
  // Create a new request
  async createRequest(data: {
    attendanceId: string;
    reason: string;
    attendanceMode: AttendanceMode;
    timeAdjustment?: TimeAdjustment;
  }) {
    const attendance = await prisma.attendance.findUnique({
      where: { attendanceId: data.attendanceId },
      include: { meeting: true },
    });

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    const meeting = attendance.meeting;
    if (!meeting?.startTime) {
      throw new Error('Meeting date or time missing');
    }

    const isLate = isMeetingRequestLate(meeting.startTime);

    return prisma.request.create({
      data: {
        attendanceId: data.attendanceId,
        reason: data.reason.trim(),
        attendanceMode: data.attendanceMode,
        timeAdjustment: data.timeAdjustment || undefined,
        isLate,
      },
    });
  },

  // Get a single request by ID
  async getRequest(requestId: string) {
    return prisma.request.findUnique({
      where: { requestId },
      include: {
        attendance: {
          include: {
            meeting: true,
            user: true,
          },
        },
      },
    });
  },

  // Get all requests with meeting and user info
  async getAllRequests() {
    return prisma.request.findMany({
      include: {
        attendance: {
          include: {
            meeting: true,
            user: true,
          },
        },
      },
      orderBy: {
        attendance: {
          meeting: {
            date: 'desc',
          },
        },
      },
    });
  },

  // Update request
  async updateRequest(
    requestId: string,
    data: {
      reason?: string;
      attendanceMode?: AttendanceMode;
      timeAdjustment?: TimeAdjustment | null;
    },
  ) {
    return prisma.request.update({
      where: { requestId },
      data,
    });
  },

  // Delete request
  async deleteRequest(requestId: string) {
    return prisma.request.delete({
      where: { requestId },
    });
  },
};
