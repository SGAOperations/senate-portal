import { prisma } from '../../lib/prisma';
import { SemesterService } from '../semester.service';
import { parseMeetingDate } from '@/meeting/meetingDateTime';

// Far-future years so these never overlap real semesters.
const TEST_YEARS = { gte: 2091, lte: 2093 };

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
    // 2091-07-01T02:00Z is 10pm on June 30 in New York
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

  it('switches on the first day of the next semester', async () => {
    const current = await SemesterService.getCurrentSemester(
      parseMeetingDate('2093-01-10'),
    );
    expect(current).toMatchObject({ term: 'SPRING', year: 2093 });
  });

  it('assigns a meeting in a break to its term instead of creating one', async () => {
    const fall = await prisma.semester.findUniqueOrThrow({
      // eslint-disable-next-line
      where: { term_year: { term: 'FALL', year: 2092 } },
    });
    const semesterId = await SemesterService.getOrCreateSemesterIdForDate(
      parseMeetingDate('2092-12-20'),
    );
    expect(semesterId).toBe(fall.semesterId);
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
