import { NextResponse } from 'next/server';
import { MeetingService } from './meeting.service';
import { MeetingType } from '../generated/prisma';
import { MeetingDateTimeInputError } from './meetingDateTime';

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

    // Validate required fields
    if (
      !body.name ||
      !body.startTime ||
      !body.date ||
      !body.endTime ||
      body === undefined ||
      !body.type
    ) {
      const requiredFields = ['name', 'startTime', 'date', 'endTime', 'type'];
      const missingFields = requiredFields.filter((field) => {
        const value = body[field];
        return value === undefined || value === null || value === '';
      });
      return NextResponse.json(
        { error: 'Missing required fields', missingFields },
        { status: 400 },
      );
    }

    // Validate type enum
    if (body.type !== 'FULL_BODY' && body.type !== 'REGULAR') {
      return NextResponse.json(
        { error: 'Invalid meeting type. Must be FULL_BODY or REGULAR' },
        { status: 400 },
      );
    }

    // Validate attendeeIds if provided
    if (body.attendeeIds && !Array.isArray(body.attendeeIds)) {
      return NextResponse.json(
        { error: 'attendeeIds must be an array' },
        { status: 400 },
      );
    }

    try {
      const newMeeting = await MeetingService.createMeeting(
        body,
        body.attendeeIds || [],
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
    const updates = await request.json();

    // Validate type enum if provided
    if (updates.type && !Object.values(MeetingType).includes(updates.type)) {
      return NextResponse.json(
        { error: 'Invalid meeting type. Must be FULL_BODY or REGULAR' },
        { status: 400 },
      );
    }

    try {
      const updatedMeeting = await MeetingService.updateMeeting(
        params.meetingId,
        updates,
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
