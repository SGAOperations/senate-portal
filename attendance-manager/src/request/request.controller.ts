import { RequestService } from './request.service';
import { NextResponse } from 'next/server';
import { AttendanceMode } from '../generated/prisma';
import { UserFacingError } from '../utils/api-errors';

// built from the Prisma enum so a new mode is picked up automatically
const ALLOWED_ATTENDANCE_MODES: string[] = Object.values(AttendanceMode);

function isAttendanceMode(mode: any): mode is AttendanceMode {
  return typeof mode === 'string' && ALLOWED_ATTENDANCE_MODES.includes(mode);
}

const NOT_ATTENDING_WITH_TIME_ADJUSTMENT =
  'Not attending cannot be combined with arriving late or leaving early';

export const RequestController = {
  async listRequest() {
    const meeting = await RequestService.getAllRequests();
    return NextResponse.json(meeting);
  },

  async getRequest(requestId: string) {
    if (!requestId || typeof requestId !== 'string') {
      throw new UserFacingError('Invalid or missing requestId', 400);
    }
    return RequestService.getRequest(requestId);
  },

  async createRequest(data: any) {
    if (
      !data ||
      typeof data.attendanceId !== 'string' ||
      typeof data.reason !== 'string' ||
      !data.reason.trim() ||
      !data.attendanceMode ||
      !isAttendanceMode(data.attendanceMode)
    ) {
      throw new UserFacingError('Invalid input data for creating request', 400);
    }

    // Validate timeAdjustment if provided
    if (
      data.timeAdjustment &&
      data.timeAdjustment !== 'ARRIVING_LATE' &&
      data.timeAdjustment !== 'LEAVING_EARLY'
    ) {
      throw new UserFacingError('Invalid timeAdjustment value', 400);
    }

    // Not attending can't be combined with arriving late / leaving early
    if (data.attendanceMode === 'ABSENT' && data.timeAdjustment) {
      throw new UserFacingError(NOT_ATTENDING_WITH_TIME_ADJUSTMENT, 400);
    }

    return RequestService.createRequest({
      attendanceId: data.attendanceId,
      reason: data.reason.trim(),
      attendanceMode: data.attendanceMode,
      timeAdjustment: data.timeAdjustment || undefined,
    });
  },

  async updateRequest(requestId: string, data: any) {
    if (!requestId || typeof requestId !== 'string') {
      throw new UserFacingError('Invalid or missing requestId', 400);
    }

    if (
      data.reason &&
      (typeof data.reason !== 'string' || !data.reason.trim())
    ) {
      throw new UserFacingError('Invalid request reason', 400);
    }

    // Validate attendanceMode if provided
    if (data.attendanceMode && !isAttendanceMode(data.attendanceMode)) {
      throw new UserFacingError('Invalid attendanceMode value', 400);
    }

    // Validate timeAdjustment if provided
    if (
      data.timeAdjustment &&
      data.timeAdjustment !== 'ARRIVING_LATE' &&
      data.timeAdjustment !== 'LEAVING_EARLY' &&
      data.timeAdjustment !== null
    ) {
      throw new UserFacingError('Invalid timeAdjustment value', 400);
    }

    // A partial update can create the combo from either side, so check the
    // result of applying it to the stored request, not just the body
    if ('attendanceMode' in data || 'timeAdjustment' in data) {
      const existing = await RequestService.getRequest(requestId);
      if (existing) {
        const mode = data.attendanceMode || existing.attendanceMode;
        const timeAdjustment =
          'timeAdjustment' in data
            ? data.timeAdjustment
            : existing.timeAdjustment;
        if (mode === 'ABSENT' && timeAdjustment) {
          throw new UserFacingError(NOT_ATTENDING_WITH_TIME_ADJUSTMENT, 400);
        }
      }
    }

    const updateData: any = {};
    if (data.reason) {
      updateData.reason = data.reason.trim();
    }
    if (data.attendanceMode) {
      updateData.attendanceMode = data.attendanceMode;
    }
    if ('timeAdjustment' in data) {
      updateData.timeAdjustment = data.timeAdjustment;
    }

    return RequestService.updateRequest(requestId, updateData);
  },

  async deleteRequest(requestId: string) {
    if (!requestId || typeof requestId !== 'string') {
      throw new UserFacingError('Invalid or missing requestId', 400);
    }
    return RequestService.deleteRequest(requestId);
  },
};
