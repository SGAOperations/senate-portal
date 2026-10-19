import { prisma } from '../../lib/prisma';
import * as apiAuth from '@/utils/api-auth';
import { SemesterService } from '../semester.service';
import { GET as getCurrentSemesterRoute } from '@/app/api/semester/current/route';
import { POST as createMeetingRoute } from '@/app/api/meeting/route';
import { PUT as updateMeetingRoute } from '@/app/api/meeting/[id]/route';

const TEST_YEAR = 2095;

function jsonRequest(method: string, body: unknown) {
  return new Request('http://localhost/api/meeting', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const idParams = (id: string) => ({ params: Promise.resolve({ id }) });

async function cleanup() {
  await prisma.meeting.deleteMany({
    where: { semester: { year: TEST_YEAR } },
  });
  await prisma.semester.deleteMany({ where: { year: TEST_YEAR } });
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
