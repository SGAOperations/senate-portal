import { prisma } from '@/server/db/prisma';
import {
  semesterIdFor,
  signInAsActor,
  testActor,
  uniqueUserFields,
} from '@/test/helpers';
import { GET as getMeetingAttendance } from '@/app/api/attendance/meeting/[meetingId]/route';
import { GET as getUserAttendance } from '@/app/api/attendance/user/[userId]/route';
import { GET as getRemainingAbsences } from '@/app/api/attendance/user/[userId]/remaining-absences/route';
import { GET as getUserRequests } from '@/app/api/attendance/user/requests/[userId]/route';
import { PUT as updateAttendanceStatus } from '@/app/api/attendance/status/route';
import { POST as createAttendance } from '@/app/api/attendance/route';
import { PUT as attendanceUpdate } from '@/app/api/users/attendance_update/route';
import { GET as getMeetingUsers } from '@/app/api/meeting/[id]/users/route';
import { NextRequest } from 'next/server';

jest.setTimeout(20000);

// Attendance routes: 401 signed out, 403 for someone else's records, and
// staff (manageAttendance / readRecords) see everyone's.

let memberId: string;
let otherId: string;
let pastMeetingId: string;
let futureMeetingId: string;

const asMember = () =>
  signInAsActor(testActor({ userId: memberId, capabilities: ['roster'] }));
const asManager = () =>
  signInAsActor(
    testActor({ userId: null, capabilities: ['manageAttendance'] }),
  );
const asReader = () =>
  signInAsActor(testActor({ userId: null, capabilities: ['readRecords'] }));
const signedOut = () => signInAsActor(null);

const userParams = (userId: string) => ({
  params: Promise.resolve({ userId }),
});
const getReq = () => new NextRequest('http://localhost/api/attendance');
const jsonReq = (method: string, body: unknown) =>
  new NextRequest('http://localhost/api/attendance', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

async function createMeeting(name: string, start: Date) {
  return prisma.meeting.create({
    data: {
      name,
      date: start,
      semesterId: await semesterIdFor(start),
      startTime: start,
      endTime: new Date(start.getTime() + 60 * 60 * 1000),
      notes: '',
      type: 'REGULAR',
    },
  });
}

beforeAll(async () => {
  memberId = (
    await prisma.user.create({
      data: {
        ...uniqueUserFields(),
        firstName: 'Route',
        lastName: 'Member',
        positionKeys: ['senator'],
      },
    })
  ).userId;
  otherId = (
    await prisma.user.create({
      data: {
        ...uniqueUserFields(),
        firstName: 'Route',
        lastName: 'Other',
        positionKeys: ['senator'],
      },
    })
  ).userId;

  pastMeetingId = (
    await createMeeting(
      'Attendance routes past',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    )
  ).meetingId;
  futureMeetingId = (
    await createMeeting(
      'Attendance routes future',
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    )
  ).meetingId;

  await prisma.attendance.createMany({
    data: [
      { userId: memberId, meetingId: pastMeetingId, status: 'PRESENT' },
      { userId: otherId, meetingId: pastMeetingId, status: 'PRESENT' },
      {
        userId: memberId,
        meetingId: futureMeetingId,
        status: 'UNEXCUSED_ABSENCE',
      },
    ],
  });
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  const meetingId = { in: [pastMeetingId, futureMeetingId] };
  await prisma.request.deleteMany({
    where: { attendance: { meetingId } },
  });
  await prisma.attendance.deleteMany({ where: { meetingId } });
  await prisma.meeting.deleteMany({ where: { meetingId } });
  await prisma.user.deleteMany({
    where: { userId: { in: [memberId, otherId] } },
  });
});

describe('GET /api/attendance/meeting/[meetingId]', () => {
  const get = () =>
    getMeetingAttendance(getReq(), {
      params: Promise.resolve({ meetingId: pastMeetingId }),
    });

  it('returns 401 when signed out', async () => {
    signedOut();
    expect((await get()).status).toBe(401);
  });

  it("returns only a member's own record", async () => {
    asMember();
    const records = await (await get()).json();
    expect(records.map((r: any) => r.userId)).toEqual([memberId]);
  });

  it('returns every record to staff', async () => {
    for (const signIn of [asManager, asReader]) {
      signIn();
      const userIds = (await (await get()).json()).map((r: any) => r.userId);
      expect(userIds).toEqual(expect.arrayContaining([memberId, otherId]));
      jest.restoreAllMocks();
    }
  });
});

describe('per-member attendance GETs', () => {
  const routes = [
    ['attendance/user/[userId]', getUserAttendance],
    ['attendance/user/[userId]/remaining-absences', getRemainingAbsences],
    ['attendance/user/requests/[userId]', getUserRequests],
  ] as const;

  it.each(routes)('%s: 401 when signed out', async (_name, GET) => {
    signedOut();
    expect((await GET(getReq(), userParams(memberId))).status).toBe(401);
  });

  it.each(routes)("%s: a member's own records", async (_name, GET) => {
    asMember();
    expect((await GET(getReq(), userParams(memberId))).status).toBe(200);
  });

  it.each(routes)("%s: 403 for someone else's", async (_name, GET) => {
    asMember();
    expect((await GET(getReq(), userParams(otherId))).status).toBe(403);
  });

  it.each(routes)("%s: staff see anyone's", async (_name, GET) => {
    asReader();
    expect((await GET(getReq(), userParams(otherId))).status).toBe(200);
  });
});

describe('attendance writes that need manageAttendance', () => {
  it('PUT /api/attendance/status: 401 signed out, 403 for a member', async () => {
    const body = { requestId: 'x', status: 'EXCUSED_ABSENCE' };
    signedOut();
    expect((await updateAttendanceStatus(jsonReq('PUT', body))).status).toBe(
      401,
    );
    jest.restoreAllMocks();
    asMember();
    expect((await updateAttendanceStatus(jsonReq('PUT', body))).status).toBe(
      403,
    );
  });

  it('POST /api/attendance: 403 for a member, allowed for a manager', async () => {
    const body = {
      userId: otherId,
      meetingId: futureMeetingId,
      status: 'PRESENT',
    };
    asMember();
    expect((await createAttendance(jsonReq('POST', body))).status).toBe(403);
    jest.restoreAllMocks();
    asManager();
    expect((await createAttendance(jsonReq('POST', body))).status).toBe(200);
  });

  it('GET /api/meeting/[id]/users: 403 for a member, allowed for staff', async () => {
    const params = { params: Promise.resolve({ id: pastMeetingId }) };
    asMember();
    expect((await getMeetingUsers(getReq(), params)).status).toBe(403);
    jest.restoreAllMocks();
    asReader();
    expect((await getMeetingUsers(getReq(), params)).status).toBe(200);
  });
});

describe('PUT /api/users/attendance_update', () => {
  const put = (body: unknown) =>
    attendanceUpdate(
      new Request('http://localhost/api/users/attendance_update', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  const statusOf = async (userId: string, meetingId: string) =>
    (
      await prisma.attendance.findUnique({
        where: { userId_meetingId: { userId, meetingId } },
      })
    )?.status;

  it('returns 401 when signed out', async () => {
    signedOut();
    const response = await put({
      userId: memberId,
      meetingId: futureMeetingId,
      status: 'PENDING',
    });
    expect(response.status).toBe(401);
  });

  it('lets a member mark their own upcoming meeting PENDING', async () => {
    asMember();
    const response = await put({
      userId: memberId,
      meetingId: futureMeetingId,
      status: 'PENDING',
    });
    expect(response.status).toBe(200);
    expect(await statusOf(memberId, futureMeetingId)).toBe('PENDING');
  });

  it('refuses a member any other status', async () => {
    asMember();
    const response = await put({
      userId: memberId,
      meetingId: futureMeetingId,
      status: 'PRESENT',
    });
    expect(response.status).toBe(403);
  });

  it('refuses PENDING for a meeting that has started', async () => {
    asMember();
    const response = await put({
      userId: memberId,
      meetingId: pastMeetingId,
      status: 'PENDING',
    });
    expect(response.status).toBe(403);
    expect(await statusOf(memberId, pastMeetingId)).toBe('PRESENT');
  });

  it("refuses PENDING on someone else's record", async () => {
    asMember();
    const response = await put({
      userId: otherId,
      meetingId: futureMeetingId,
      status: 'PENDING',
    });
    expect(response.status).toBe(403);
  });

  it('lets a manager set any status (check-in)', async () => {
    asManager();
    const response = await put({
      userId: otherId,
      meetingId: pastMeetingId,
      status: 'UNEXCUSED_ABSENCE',
    });
    expect(response.status).toBe(200);
    expect(await statusOf(otherId, pastMeetingId)).toBe('UNEXCUSED_ABSENCE');
  });
});
