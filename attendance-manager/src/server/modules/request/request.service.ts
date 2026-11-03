import { prisma } from '@/server/db/prisma';
import { AttendanceMode, Prisma, TimeAdjustment } from '@/generated/prisma';
import { isMeetingRequestLate } from '@/utils/meeting-time';
import { UserFacingError } from '@/server/http/api-errors';

// Prisma throws P2025 when updating or deleting a row that doesn't exist.
// A missing request is the caller's mistake, not a server error, so send a 404.
function throwIfRequestNotFound(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw new UserFacingError('Request not found', 404);
  }
}

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
      throw new UserFacingError('Attendance record not found', 404);
    }

    const meeting = attendance.meeting;
    if (!meeting?.startTime) {
      throw new Error('Meeting date or time missing');
    }

    const isLate = isMeetingRequestLate(meeting.startTime);

    try {
      return await prisma.request.create({
        data: {
          attendanceId: data.attendanceId,
          reason: data.reason.trim(),
          attendanceMode: data.attendanceMode,
          timeAdjustment: data.timeAdjustment || undefined,
          isLate,
        },
      });
    } catch (error) {
      // attendanceId is @unique, so the database rejects a second request for
      // the same attendance record. Catching it here (instead of checking
      // first) also covers two submits racing each other, e.g. a double-click.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new UserFacingError(
          'You already have a request for this meeting.',
          409,
        );
      }
      throw error;
    }
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
      // skip requests for soft-deleted meetings
      where: { attendance: { meeting: { deletedAt: null } } },
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
    try {
      return await prisma.request.update({
        where: { requestId },
        data,
      });
    } catch (error) {
      throwIfRequestNotFound(error);
      throw error;
    }
  },

  // Delete request
  async deleteRequest(requestId: string) {
    try {
      return await prisma.request.delete({
        where: { requestId },
      });
    } catch (error) {
      throwIfRequestNotFound(error);
      throw error;
    }
  },
};
