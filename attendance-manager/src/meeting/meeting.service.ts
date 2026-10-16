import { prisma } from '../lib/prisma';
import { MeetingType } from '../generated/prisma';
import {
  formatMeetingDateInput,
  formatMeetingTimeInput,
  parseMeetingDate,
  parseMeetingDateTime,
} from './meetingDateTime';

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
    const now = new Date();
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
      where: { deletedAt: null, startTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      include,
    });
    if (upcoming.length > 0) return upcoming.map(toResult);
    // Fallback: no upcoming meetings, return all so the dropdown is never empty
    const all = await prisma.meeting.findMany({
      where: { deletedAt: null },
      orderBy: { startTime: 'desc' },
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
    return groupBy(meetings, (meeting) => formatMeetingDateInput(meeting.date));
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
    meetingData: {
      name: string;
      startTime: string;
      date: string;
      endTime: string;
      notes: string;
      type: MeetingType;
    },
    attendeeIds: string[],
  ) {
    // Create meeting - only pass meeting fields to Prisma
    const meeting = await prisma.meeting.create({
      data: {
        name: meetingData.name,
        startTime: parseMeetingDateTime(
          meetingData.date,
          meetingData.startTime,
        ),
        date: parseMeetingDate(meetingData.date),
        endTime: parseMeetingDateTime(meetingData.date, meetingData.endTime),
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
    }>,
  ) {
    const existingMeeting = await prisma.meeting.findUniqueOrThrow({
      where: { meetingId },
      select: { date: true, startTime: true, endTime: true },
    });
    const meetingDate =
      updates.date ?? formatMeetingDateInput(existingMeeting.date);
    const shouldUpdateStartTime =
      updates.date !== undefined || updates.startTime !== undefined;
    const shouldUpdateEndTime =
      updates.date !== undefined || updates.endTime !== undefined;

    return prisma.meeting.update({
      where: { meetingId },
      data: {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
        ...(updates.type !== undefined ? { type: updates.type } : {}),
        ...(updates.date !== undefined
          ? { date: parseMeetingDate(updates.date) }
          : {}),
        ...(shouldUpdateStartTime
          ? {
              startTime: parseMeetingDateTime(
                meetingDate,
                updates.startTime ??
                  formatMeetingTimeInput(existingMeeting.startTime),
              ),
            }
          : {}),
        ...(shouldUpdateEndTime
          ? {
              endTime: parseMeetingDateTime(
                meetingDate,
                updates.endTime ??
                  formatMeetingTimeInput(existingMeeting.endTime),
              ),
            }
          : {}),
        updatedAt: new Date(),
      },
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
      data: { deletedAt: new Date() },
    });
  },
};
