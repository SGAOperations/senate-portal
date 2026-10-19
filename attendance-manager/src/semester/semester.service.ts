import { prisma } from '../lib/prisma';
import { Term } from '../generated/prisma';
import { formatMeetingDateInput } from '../meeting/meetingDateTime';

function toSemesterDay(value: Date): Date {
  return new Date(`${formatMeetingDateInput(value)}T00:00:00.000Z`);
}

function defaultSemesterFor(day: Date) {
  const year = day.getUTCFullYear();
  const isSpring = day.getUTCMonth() < 6;
  return {
    term: isSpring ? Term.SPRING : Term.FALL,
    year,
    startsOn: new Date(Date.UTC(year, isSpring ? 0 : 6, 1)),
    endsOn: new Date(Date.UTC(year, isSpring ? 5 : 11, isSpring ? 30 : 31)),
  };
}

export const SemesterService = {
  async getSemesterForDate(date: Date) {
    const day = toSemesterDay(date);
    return prisma.semester.findFirst({
      where: { startsOn: { lte: day }, endsOn: { gte: day } },
    });
  },

  async getCurrentSemester(now: Date = new Date()) {
    return prisma.semester.findFirst({
      where: { startsOn: { lte: toSemesterDay(now) } },
      orderBy: { startsOn: 'desc' },
    });
  },

  async getOrCreateSemesterIdForDate(date: Date): Promise<string> {
    const existing = await SemesterService.getSemesterForDate(date);
    if (existing) return existing.semesterId;

    const { term, year, startsOn, endsOn } = defaultSemesterFor(
      toSemesterDay(date),
    );
    const semester = await prisma.semester.upsert({
      // eslint-disable-next-line
      where: { term_year: { term, year } },
      update: {},
      create: { term, year, startsOn, endsOn },
    });
    return semester.semesterId;
  },
};
