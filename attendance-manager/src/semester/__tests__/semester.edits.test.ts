import { prisma } from '../../lib/prisma';
import { SemesterService } from '../semester.service';
import { AttendanceService } from '@/attendance/attendance.service';
import {
  parseMeetingDate,
  parseMeetingDateTime,
} from '@/meeting/meetingDateTime';

const TEST_YEARS = { gte: 2097, lte: 2098 };
const USER_ID = 'semester-edits-user';
const ROLE_ID = 'semester-edits-role';

function day(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

let fallId: string;
let springId: string;
let meetingId: string;

async function cleanup() {
  await prisma.attendance.deleteMany({ where: { userId: USER_ID } });
  await prisma.meeting.deleteMany({
    where: { semester: { year: TEST_YEARS } },
  });
  await prisma.semester.deleteMany({ where: { year: TEST_YEARS } });
  await prisma.user.deleteMany({ where: { userId: USER_ID } });
  await prisma.role.deleteMany({ where: { roleId: ROLE_ID } });
}

beforeAll(async () => {
  await cleanup();
  await prisma.role.create({ data: { roleId: ROLE_ID, roleType: 'MEMBER' } });
  await prisma.user.create({
    data: {
      userId: USER_ID,
      supabaseAuthId: 'semester-edits-auth',
      nuid: '009999002',
      email: 'semester-edits@example.com',
      firstName: 'Semester',
      lastName: 'Edits',
      roleId: ROLE_ID,
    },
  });
  const fall = await prisma.semester.create({
    data: {
      term: 'FALL',
      year: 2097,
      startsOn: day('2097-09-01'),
      endsOn: day('2097-12-15'),
    },
  });
  const spring = await prisma.semester.create({
    data: {
      term: 'SPRING',
      year: 2098,
      startsOn: day('2098-01-10'),
      endsOn: day('2098-05-01'),
    },
  });
  fallId = fall.semesterId;
  springId = spring.semesterId;

  const meeting = await prisma.meeting.create({
    data: {
      name: 'Semester Edits Edge Meeting',
      date: parseMeetingDate('2097-12-14'),
      startTime: parseMeetingDateTime('2097-12-14', '19:00'),
      endTime: parseMeetingDateTime('2097-12-14', '20:00'),
      notes: '',
      type: 'REGULAR',
      semesterId: fallId,
    },
  });
  meetingId = meeting.meetingId;
  await prisma.attendance.create({
    data: { userId: USER_ID, meetingId, status: 'UNEXCUSED_ABSENCE' },
  });
});

afterAll(cleanup);

async function meetingSemesterId() {
  const meeting = await prisma.meeting.findUniqueOrThrow({
    where: { meetingId },
  });
  return meeting.semesterId;
}

describe('SemesterService.updateSemesterDates', () => {
  it('keeps a meeting in its semester when an edit leaves it closest', async () => {
    await SemesterService.updateSemesterDates(
      fallId,
      day('2097-09-01'),
      day('2097-12-10'),
    );
    expect(await meetingSemesterId()).toBe(fallId);
  });

  it('moves the meeting and its absence when another semester grows over it', async () => {
    const now = parseMeetingDate('2097-12-11');
    const before = await AttendanceService.getRemainingUnexcusedAbsences(
      USER_ID,
      now,
    );
    expect(before.regular.used).toBe(1);

    await SemesterService.updateSemesterDates(
      springId,
      day('2097-12-13'),
      day('2098-05-01'),
    );

    expect(await meetingSemesterId()).toBe(springId);
    const after = await AttendanceService.getRemainingUnexcusedAbsences(
      USER_ID,
      now,
    );
    expect(after.regular.used).toBe(0);
  });

  it('moves the meeting back when the edit is undone', async () => {
    await SemesterService.updateSemesterDates(
      springId,
      day('2098-01-10'),
      day('2098-05-01'),
    );
    await SemesterService.updateSemesterDates(
      fallId,
      day('2097-09-01'),
      day('2097-12-15'),
    );
    expect(await meetingSemesterId()).toBe(fallId);
  });

  it('rolls back an edit that would overlap another semester', async () => {
    await expect(
      SemesterService.updateSemesterDates(
        fallId,
        day('2097-09-01'),
        day('2098-01-20'),
      ),
    ).rejects.toThrow();

    const fall = await prisma.semester.findUniqueOrThrow({
      where: { semesterId: fallId },
    });
    expect(fall.endsOn).toEqual(day('2097-12-15'));
    expect(await meetingSemesterId()).toBe(fallId);
  });
});
