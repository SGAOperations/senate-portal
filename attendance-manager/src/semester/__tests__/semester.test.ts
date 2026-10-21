import { prisma } from '../../lib/prisma';
import { SemesterService } from '../semester.service';
import { parseMeetingDate } from '@/meeting/meetingDateTime';

const TEST_YEARS = { gte: 2091, lte: 2094 };

function day(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function cleanup() {
  await prisma.semester.deleteMany({ where: { year: TEST_YEARS } });
}

beforeAll(cleanup);
afterAll(cleanup);

describe('SemesterService.getOrCreateSemesterIdForDate', () => {
  it('creates January-June as Spring and July-December as Fall', async () => {
    const springId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2091-06-30'),
    );
    const fallId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2091-07-01'),
    );

    const spring = await prisma.semester.findUniqueOrThrow({
      where: { semesterId: springId },
    });
    const fall = await prisma.semester.findUniqueOrThrow({
      where: { semesterId: fallId },
    });
    expect(spring).toMatchObject({
      term: 'SPRING',
      year: 2091,
      startsOn: day('2091-01-01'),
      endsOn: day('2091-06-30'),
    });
    expect(fall).toMatchObject({
      term: 'FALL',
      year: 2091,
      startsOn: day('2091-07-01'),
      endsOn: day('2091-12-31'),
    });
  });

  it('uses the Eastern calendar day, not the UTC one', async () => {
    const semester = await SemesterService.getSemesterForDate(
      new Date('2091-07-01T02:00:00.000Z'),
    );
    expect(semester?.term).toBe('SPRING');
    expect(semester?.year).toBe(2091);
  });
});

describe('SemesterService with admin-defined bounds', () => {
  beforeAll(async () => {
    await prisma.semester.createMany({
      data: [
        {
          term: 'FALL',
          year: 2092,
          startsOn: day('2092-09-01'),
          endsOn: day('2092-12-15'),
        },
        {
          term: 'SPRING',
          year: 2093,
          startsOn: day('2093-01-10'),
          endsOn: day('2093-05-01'),
        },
      ],
    });
  });

  it('treats the semester containing today as current', async () => {
    const current = await SemesterService.getCurrentSemester(
      parseMeetingDate('2092-10-01'),
    );
    expect(current).toMatchObject({ term: 'FALL', year: 2092 });
  });

  it('keeps the previous semester current during a break', async () => {
    const current = await SemesterService.getCurrentSemester(
      parseMeetingDate('2092-12-20'),
    );
    expect(current).toMatchObject({ term: 'FALL', year: 2092 });
  });

  it('creates a missing term that fits before an edited semester', async () => {
    await prisma.semester.create({
      data: {
        term: 'SPRING',
        year: 2094,
        startsOn: day('2093-12-01'),
        endsOn: day('2094-05-01'),
      },
    });

    const semesterId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2093-10-01'),
    );

    const fall = await prisma.semester.findUniqueOrThrow({
      where: { semesterId },
    });
    expect(fall).toMatchObject({
      term: 'FALL',
      year: 2093,
      startsOn: day('2093-07-01'),
      endsOn: day('2093-11-30'),
    });
  });

  it('switches on the first day of the next semester', async () => {
    const current = await SemesterService.getCurrentSemester(
      parseMeetingDate('2093-01-10'),
    );
    expect(current).toMatchObject({ term: 'SPRING', year: 2093 });
  });

  it('assigns a break day to the closest existing semester', async () => {
    const fall = await prisma.semester.findUniqueOrThrow({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { term_year: { term: 'FALL', year: 2092 } },
    });
    const semesterId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2092-12-20'),
    );
    expect(semesterId).toBe(fall.semesterId);
  });

  it('assigns a break day to the next semester when it is closer', async () => {
    const spring = await prisma.semester.findUniqueOrThrow({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { term_year: { term: 'SPRING', year: 2093 } },
    });
    const semesterId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2092-12-30'),
    );
    expect(semesterId).toBe(spring.semesterId);
  });

  it('creates the next term instead of reusing the previous one', async () => {
    const previous = await prisma.semester.findUniqueOrThrow({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { term_year: { term: 'SPRING', year: 2094 } },
    });
    const semesterId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2094-09-15'),
    );
    expect(semesterId).not.toBe(previous.semesterId);

    const fall = await prisma.semester.findUniqueOrThrow({
      where: { semesterId },
    });
    expect(fall).toMatchObject({
      term: 'FALL',
      year: 2094,
      startsOn: day('2094-07-01'),
      endsOn: day('2094-12-31'),
    });
  });

  it('rejects overlapping semesters', async () => {
    await expect(
      prisma.semester.create({
        data: {
          term: 'SPRING',
          year: 2092,
          startsOn: day('2092-01-01'),
          endsOn: day('2092-09-01'),
        },
      }),
    ).rejects.toThrow();
  });
});
