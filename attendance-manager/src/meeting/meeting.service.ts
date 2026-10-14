import { prisma } from '../lib/prisma';
import { MeetingType } from '../generated/prisma';
import type { CreateMeetingInput } from '../types';

function groupBy<T, K extends string | number | symbol>(
  items: T[],

  keyGetter: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (result, item) => {
      const key = keyGetter(item);
      (result[key] ||= []).push(item);
      return result;
    },
    {} as Record<K, T[]>,
  );
}

export const MeetingService = {
  async getAllMeeting() {
    return await prisma.meeting.findMany({
      // dont get soft deleted meetings
      where: {
        deletedAt: null,
      },
      include: {
        attendance: {
          include: {
            user: true,
          },
        },
      },
    });
  },

  async getUpcomingMeetings() {
    const today = new Date().toISOString().slice(0, 10);
    const include = {
      attendance: {
        where: { status: 'PRESENT' as const },
        select: { attendanceId: true },
      },
    };
    const toResult = ({
      attendance,
      ...m
    }: {
      attendance: unknown[];
      [key: string]: unknown;
    }) => ({
      ...m,
      eligibleCount: attendance.length,
    });
    const upcoming = await prisma.meeting.findMany({
      where: { deletedAt: null, date: { gte: today } },
      orderBy: { date: 'asc' },
      include,
    });
    if (upcoming.length > 0) return upcoming.map(toResult);
    // Fallback: no upcoming meetings, return all so the dropdown is never empty
    const all = await prisma.meeting.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
      include,
    });
    return all.map(toResult);
  },

  async getAllMeetingByDate() {
    const meetings = await prisma.meeting.findMany({
      where: {
        deletedAt: null,
      },
    });
    return groupBy(meetings, (meeting) => meeting.date);
  },

  async getMeetingById(meetingId: string) {
    return prisma.meeting.findUnique({
      where: { meetingId, deletedAt: null },
    });
  },

  async getUsersByMeetingId(meetingId: string) {
    const attendance = await prisma.user.findMany({
      include: {
        attendance: true,
      },
      where: {
        attendance: {
          some: { meetingId },
        },
      },
    });
    return attendance;
  },

  async createMeeting(
    meetingData: Omit<CreateMeetingInput, 'attendeeIds'>,
    attendeeIds: string[],
  ) {
    // Create meeting - only pass meeting fields to Prisma
    const meeting = await prisma.meeting.create({
      data: {
        name: meetingData.name,
        startTime: meetingData.startTime,
        date: meetingData.date,
        endTime: meetingData.endTime,
        notes: meetingData.notes,
        type: meetingData.type,
      },
    });

    // Create attendance records for all selected attendees
    if (attendeeIds.length > 0) {
      await prisma.attendance.createMany({
        data: attendeeIds.map((userId) => ({
          userId,
          meetingId: meeting.meetingId,
          status: 'UNEXCUSED_ABSENCE' as const,
        })),
      });
    }

    return meeting;
  },

  async updateMeeting(
    meetingId: string,
    updates: Partial<{
      name: string;
      meetingId: string;
      startTime: string;
      endTime: string;
      notes: string;
      date: string;
      type: MeetingType;
      updatedAt: string;
    }>,
  ) {
    updates.updatedAt = new Date().toISOString();
    return prisma.meeting.update({
      where: { meetingId },
      data: updates,
    });
  },

  async deleteMeeting(meetingId: string) {
    const events = await prisma.votingEvent.findMany({
      where: { meetingId },
      select: { votingEventId: true },
    });

    const eventIds = events.map((e) => e.votingEventId);
    if (eventIds.length > 0) {
      await prisma.votingRecord.deleteMany({
        where: { votingEventId: { in: eventIds } },
      });
    }

    await prisma.votingEvent.deleteMany({ where: { meetingId } });

    // Delete attendance records
    await prisma.attendance.deleteMany({
      where: { meetingId },
    });

    return prisma.meeting.delete({
      where: { meetingId },
    });
  },

  async softDeleteMeeting(meetingId: string) {
    return prisma.meeting.update({
      where: { meetingId },
      data: { deletedAt: new Date().toISOString() },
    });
  },
};
