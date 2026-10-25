import { prisma } from '../lib/prisma';
import { Prisma, Term } from '../generated/prisma';
import { formatMeetingDateInput } from '../meeting/meetingDateTime';

type Db = Prisma.TransactionClient;

export class SemesterNotFoundError extends Error {}
export class SemesterDateRangeError extends Error {}
export class SemesterOverlapError extends Error {}

function toSemesterDay(value: Date): Date {
  return new Date(`${formatMeetingDateInput(value)}T00:00:00.000Z`);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
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

function findNeighbors(db: Db, startsOn: Date, endsOn: Date) {
  return Promise.all([
    db.semester.findFirst({
      where: { endsOn: { lt: startsOn } },
      orderBy: { endsOn: 'desc' },
    }),
    db.semester.findFirst({
      where: { startsOn: { gt: endsOn } },
      orderBy: { startsOn: 'asc' },
    }),
  ]);
}

export const SemesterService = {
  async getSemesterForDate(date: Date, db: Db = prisma) {
    const day = toSemesterDay(date);
    return db.semester.findFirst({
      where: { startsOn: { lte: day }, endsOn: { gte: day } },
    });
  },

  async getCurrentSemester(now: Date = new Date()) {
    return prisma.semester.findFirst({
      where: { startsOn: { lte: toSemesterDay(now) } },
      orderBy: { startsOn: 'desc' },
    });
  },

  async getOrCreateSemesterIdForDate(
    date: Date,
    db: Db = prisma,
  ): Promise<string> {
    const existing = await SemesterService.getSemesterForDate(date, db);
    if (existing) return existing.semesterId;

    const day = toSemesterDay(date);
    const [previous, next] = await findNeighbors(db, day, day);

    const { term, year, ...defaults } = defaultSemesterFor(day);
    const sameTerm = await db.semester.findUnique({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { term_year: { term, year } },
    });

    if (sameTerm) {
      const daysAfterPrevious = previous
        ? day.getTime() - previous.endsOn.getTime()
        : Infinity;
      const daysBeforeNext = next
        ? next.startsOn.getTime() - day.getTime()
        : Infinity;
      const closest = daysAfterPrevious <= daysBeforeNext ? previous : next;
      if (closest) return closest.semesterId;
    }

    let { startsOn, endsOn } = defaults;
    if (previous && previous.endsOn >= startsOn) {
      startsOn = addDays(previous.endsOn, 1);
    }
    if (next && next.startsOn <= endsOn) {
      endsOn = addDays(next.startsOn, -1);
    }
    const semester = await db.semester.upsert({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { term_year: { term, year } },
      update: {},
      create: { term, year, startsOn, endsOn },
    });
    return semester.semesterId;
  },

  async updateSemesterDates(semesterId: string, startsOn: Date, endsOn: Date) {
    if (startsOn > endsOn) {
      throw new SemesterDateRangeError('startsOn must be on or before endsOn');
    }

    return prisma.$transaction(
      async (tx) => {
        const before = await tx.semester.findUnique({
          where: { semesterId },
        });
        if (!before) {
          throw new SemesterNotFoundError(`Semester ${semesterId} not found`);
        }

        const overlapping = await tx.semester.findFirst({
          where: {
            semesterId: { not: semesterId },
            startsOn: { lte: endsOn },
            endsOn: { gte: startsOn },
          },
        });
        if (overlapping) {
          throw new SemesterOverlapError(
            `Those dates overlap ${overlapping.term} ${overlapping.year}`,
          );
        }

        const oldNeighbors = await findNeighbors(
          tx,
          before.startsOn,
          before.endsOn,
        );

        const semester = await tx.semester.update({
          where: { semesterId },
          data: { startsOn, endsOn },
        });
        const newNeighbors = await findNeighbors(
          tx,
          semester.startsOn,
          semester.endsOn,
        );

        const affectedIds = new Set([semesterId]);
        for (const neighbor of [...oldNeighbors, ...newNeighbors]) {
          if (neighbor) affectedIds.add(neighbor.semesterId);
        }

        const meetings = await tx.meeting.findMany({
          where: { semesterId: { in: [...affectedIds] } },
          select: { meetingId: true, date: true, semesterId: true },
        });
        for (const meeting of meetings) {
          const assigned = await SemesterService.getOrCreateSemesterIdForDate(
            meeting.date,
            tx,
          );
          if (assigned !== meeting.semesterId) {
            await tx.meeting.update({
              where: { meetingId: meeting.meetingId },
              data: { semesterId: assigned },
            });
          }
        }

        return semester;
      },
      { timeout: 20_000 },
    );
  },
};
