import { prisma } from '../../lib/prisma';
import * as apiAuth from '@/utils/api-auth';
import { SemesterService } from '../semester.service';
import { GET as getCurrentSemesterRoute } from '@/app/api/semester/current/route';
import { POST as createMeetingRoute } from '@/app/api/meeting/route';
import { PUT as updateMeetingRoute } from '@/app/api/meeting/[id]/route';
import { PUT as updateSemesterRoute } from '@/app/api/semester/[id]/route';
import { NextResponse } from 'next/server';
import {
  parseMeetingDate,
  parseMeetingDateTime,
} from '@/meeting/meetingDateTime';

const TEST_YEAR = 2095;
const EDIT_YEAR = 2096;

function day(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function signInAs(roleType: 'EBOARD' | 'MEMBER') {
  jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
    user: { role: { roleType } } as any,
    error: null,
  });
}

function jsonRequest(method: string, body: unknown) {
  return new Request('http://localhost/api/meeting', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

async function cleanup() {
  const years = { in: [TEST_YEAR, EDIT_YEAR] };
  await prisma.meeting.deleteMany({ where: { semester: { year: years } } });
  await prisma.semester.deleteMany({ where: { year: years } });
}

beforeAll(cleanup);

afterAll(async () => {
  jest.restoreAllMocks();
  await cleanup();
});

describe('GET /api/semester/current', () => {
  it('returns the same semester as SemesterService.getCurrentSemester', async () => {
    await SemesterService.getOrCreateSemesterIdForDate(new Date());
    const expected = await SemesterService.getCurrentSemester();

    const res = await getCurrentSemesterRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.semesterId).toBe(expected?.semesterId);
    expect(['FALL', 'SPRING']).toContain(body.term);
  });

  it('has no current semester before any semester has started', async () => {
    expect(
      await SemesterService.getCurrentSemester(new Date('1900-01-01')),
    ).toBeNull();
  });
});

describe('POST /api/meeting and PUT /api/meeting/[id]', () => {
  beforeAll(() => {
    jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: { role: { roleType: 'EBOARD' } } as any,
      error: null,
    });
  });

  it('assigns the semester for the meeting date on create', async () => {
    const res = await createMeetingRoute(
      jsonRequest('POST', {
        name: 'Semester Routes Spring',
        date: `${TEST_YEAR}-03-01`,
        startTime: '19:00',
        endTime: '20:00',
        type: 'REGULAR',
        notes: '',
        attendeeIds: [],
      }),
    );
    expect(res.status).toBe(201);
    const meeting = await res.json();
    const semester = await prisma.semester.findUniqueOrThrow({
      where: { semesterId: meeting.semesterId },
    });
    expect(semester).toMatchObject({ term: 'SPRING', year: TEST_YEAR });
  });

  it('moves the meeting to a new semester only when the date changes', async () => {
    const created = await (
      await createMeetingRoute(
        jsonRequest('POST', {
          name: 'Semester Routes Move',
          date: `${TEST_YEAR}-02-01`,
          startTime: '19:00',
          endTime: '20:00',
          type: 'REGULAR',
          notes: '',
          attendeeIds: [],
        }),
      )
    ).json();

    const renamed = await (
      await updateMeetingRoute(
        jsonRequest('PUT', { name: 'Semester Routes Move (renamed)' }),
        idParams(created.meetingId),
      )
    ).json();
    expect(renamed.semesterId).toBe(created.semesterId);

    const moved = await updateMeetingRoute(
      jsonRequest('PUT', { date: `${TEST_YEAR}-10-01` }),
      idParams(created.meetingId),
    );
    expect(moved.status).toBe(200);
    const movedBody = await moved.json();
    expect(movedBody.semesterId).not.toBe(created.semesterId);
    const fall = await prisma.semester.findUniqueOrThrow({
      where: { semesterId: movedBody.semesterId },
    });
    expect(fall).toMatchObject({ term: 'FALL', year: TEST_YEAR });
  });
});

describe('PUT /api/semester/[id]', () => {
  let springId: string;
  let fallId: string;
  let meetingId: string;

  const putDates = (id: string, body: unknown) =>
    updateSemesterRoute(jsonRequest('PUT', body), idParams(id));

  beforeAll(async () => {
    const spring = await prisma.semester.create({
      data: {
        term: 'SPRING',
        year: EDIT_YEAR,
        startsOn: day(`${EDIT_YEAR}-01-10`),
        endsOn: day(`${EDIT_YEAR}-05-01`),
      },
    });
    const fall = await prisma.semester.create({
      data: {
        term: 'FALL',
        year: EDIT_YEAR,
        startsOn: day(`${EDIT_YEAR}-09-01`),
        endsOn: day(`${EDIT_YEAR}-12-15`),
      },
    });
    springId = spring.semesterId;
    fallId = fall.semesterId;

    const meeting = await prisma.meeting.create({
      data: {
        name: 'Semester Routes Edge',
        date: parseMeetingDate(`${EDIT_YEAR}-05-05`),
        startTime: parseMeetingDateTime(`${EDIT_YEAR}-05-05`, '19:00'),
        endTime: parseMeetingDateTime(`${EDIT_YEAR}-05-05`, '20:00'),
        notes: '',
        type: 'REGULAR',
        semesterId: springId,
      },
    });
    meetingId = meeting.meetingId;
  });

  afterEach(() => jest.restoreAllMocks());

  it('returns 401 when logged out', async () => {
    jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    });
    const res = await putDates(fallId, {
      startsOn: `${EDIT_YEAR}-09-01`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for a member', async () => {
    signInAs('MEMBER');
    const res = await putDates(fallId, {
      startsOn: `${EDIT_YEAR}-09-01`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for a date that does not exist', async () => {
    signInAs('EBOARD');
    const res = await putDates(fallId, {
      startsOn: `${EDIT_YEAR}-02-30`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown semester', async () => {
    signInAs('EBOARD');
    const res = await putDates('no-such-semester', {
      startsOn: `${EDIT_YEAR}-09-01`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when the new dates overlap another semester', async () => {
    signInAs('EBOARD');
    const res = await putDates(fallId, {
      startsOn: `${EDIT_YEAR}-04-01`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(409);
  });

  it('updates the dates and moves meetings that now fall inside them', async () => {
    signInAs('EBOARD');
    const res = await putDates(fallId, {
      startsOn: `${EDIT_YEAR}-05-03`,
      endsOn: `${EDIT_YEAR}-12-15`,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      semesterId: fallId,
      startsOn: `${EDIT_YEAR}-05-03T00:00:00.000Z`,
    });

    const meeting = await prisma.meeting.findUniqueOrThrow({
      where: { meetingId },
    });
    expect(meeting.semesterId).toBe(fallId);
  });
});
