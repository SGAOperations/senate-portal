import { NextResponse } from 'next/server';
import { MeetingService } from './meeting.service';
import { z } from 'zod';
import { MeetingType } from '../generated/prisma';
import { CreateMeetingSchema } from '../types';

export const MeetingController = {
  async listMeetings() {
    const meeting = await MeetingService.getAllMeeting();
    return NextResponse.json(meeting);
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
    const newMeeting = await MeetingService.createMeeting(
      meetingData,
      attendeeIds,
    );
    return NextResponse.json(newMeeting, { status: 201 });
  },

  async updateMeeting(request: Request, params: { meetingId: string }) {
    const updates = await request.json();

    // Validate type enum if provided
    if (updates.type && !Object.values(MeetingType).includes(updates.type)) {
      return NextResponse.json(
        { error: 'Invalid meeting type. Must be FULL_BODY or REGULAR' },
        { status: 400 },
      );
    }

    const updatedMeeting = await MeetingService.updateMeeting(
      params.meetingId,
      updates,
    );
    return NextResponse.json(updatedMeeting);
  },

  async deleteMeeting(params: { meetingId: string }) {
    await MeetingService.softDeleteMeeting(params.meetingId);

    return NextResponse.json(
      { message: 'Meeting soft deleted successfully' },
      { status: 200 },
    );
  },
};
