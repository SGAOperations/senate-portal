import { NextResponse } from 'next/server';
import { MeetingService } from './meeting.service';
import { z } from 'zod';
import { CreateMeetingSchema, UpdateMeetingSchema } from '../types';
import { MeetingDateTimeInputError } from './meetingDateTime';

// What a member may see of someone else on a meeting's attendance: no NUID
// or email. Those who may read records (readRecords) get the full row.
function redactAttendee<
  T extends { userId: string; firstName: string; lastName: string },
>(user: T) {
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export const MeetingController = {
  async listMeetings({ full }: { full: boolean }) {
    const meetings = await MeetingService.getAllMeeting();
    if (full) return NextResponse.json(meetings);
    return NextResponse.json(
      meetings.map((meeting) => ({
        ...meeting,
        attendance: meeting.attendance.map((record) => ({
          ...record,
          user: redactAttendee(record.user),
        })),
      })),
    );
  },

  async listUpcomingMeetings() {
    const meetings = await MeetingService.getUpcomingMeetings();
    return NextResponse.json(meetings);
  },

  async listMeetingsByDate() {
    const meeting = await MeetingService.getAllMeetingByDate();
    return NextResponse.json(meeting);
  },

  async getMeeting(params: { meetingId: string }) {
    const meeting = await MeetingService.getMeetingById(params.meetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json(meeting);
  },

  async getUsers(params: { meetingId: string }) {
    const meeting = await MeetingService.getUsersByMeetingId(params.meetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }
    return NextResponse.json(meeting);
  },

  async createMeeting(request: Request) {
    const body = await request.json();

    const parsed = CreateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid meeting data',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 },
      );
    }

    const { attendeeIds, ...meetingData } = parsed.data;
    try {
      const newMeeting = await MeetingService.createMeeting(
        meetingData,
        attendeeIds,
      );
      return NextResponse.json(newMeeting, { status: 201 });
    } catch (error) {
      if (error instanceof MeetingDateTimeInputError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  },

  async updateMeeting(request: Request, params: { meetingId: string }) {
    const body = await request.json();

    const parsed = UpdateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid meeting data',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 400 },
      );
    }

    try {
      const updatedMeeting = await MeetingService.updateMeeting(
        params.meetingId,
        parsed.data,
      );
      return NextResponse.json(updatedMeeting);
    } catch (error) {
      if (error instanceof MeetingDateTimeInputError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  },

  async deleteMeeting(params: { meetingId: string }) {
    await MeetingService.softDeleteMeeting(params.meetingId);

    return NextResponse.json(
      { message: 'Meeting soft deleted successfully' },
      { status: 200 },
    );
  },
};
