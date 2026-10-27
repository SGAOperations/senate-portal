import { RequestService } from './request.service';
import { NextResponse } from 'next/server';

const ALLOWED_ATTENDANCE_MODES = ['ONLINE', 'IN_PERSON', 'ABSENT'] as const;

type AttendanceMode = (typeof ALLOWED_ATTENDANCE_MODES)[number];

function isAttendanceMode(mode: any): mode is AttendanceMode {
  return (
    typeof mode === 'string' &&
    ALLOWED_ATTENDANCE_MODES.includes(mode as AttendanceMode)
  );
}

export const RequestController = {
  async listRequest() {
    const meeting = await RequestService.getAllRequests();
    return NextResponse.json(meeting);
  },

  async getRequest(requestId: string) {
    if (!requestId || typeof requestId !== 'string') {
      throw new Error('Invalid or missing requestId');
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
      throw new Error('Invalid input data for creating request');
    }

    // Validate timeAdjustment if provided
    if (
      data.timeAdjustment &&
      data.timeAdjustment !== 'ARRIVING_LATE' &&
      data.timeAdjustment !== 'LEAVING_EARLY'
    ) {
      throw new Error('Invalid timeAdjustment value');
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
      throw new Error('Invalid or missing requestId');
    }

    if (
      data.reason &&
      (typeof data.reason !== 'string' || !data.reason.trim())
    ) {
      throw new Error('Invalid request reason');
    }

    // Validate attendanceMode if provided
    if (data.attendanceMode && !isAttendanceMode(data.attendanceMode)) {
      throw new Error('Invalid attendanceMode value');
    }

    // Validate timeAdjustment if provided
    if (
      data.timeAdjustment &&
      data.timeAdjustment !== 'ARRIVING_LATE' &&
      data.timeAdjustment !== 'LEAVING_EARLY' &&
      data.timeAdjustment !== null
    ) {
      throw new Error('Invalid timeAdjustment value');
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
      throw new Error('Invalid or missing requestId');
    }
    return RequestService.deleteRequest(requestId);
  },
};
