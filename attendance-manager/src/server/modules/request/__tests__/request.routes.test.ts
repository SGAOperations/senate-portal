import { prisma } from '@/server/db/prisma';
import {
  semesterIdFor,
  signInAsActor,
  testActor,
  uniqueUserFields,
} from '@/test/helpers';
import {
  GET as listRequests,
  POST as fileRequest,
} from '@/app/api/requests/route';
import { POST as fileRequestForAttendance } from '@/app/api/attendance/[attendanceId]/requests/route';
import {
  DELETE as deleteRequest,
  GET as getRequest,
  PUT as updateRequest,
} from '@/app/api/requests/[id]/route';

jest.setTimeout(20000);

// Absence requests: members file, read, change and withdraw their own
// (changes only while pending); staff handle everyone's.

let memberId: string;
let otherId: string;
let meetingIds: string[] = [];
// attendance with no request yet, for filing
let memberOpenAttendanceId: string;
let otherOpenAttendanceId: string;
// requests that already exist
let memberPendingRequestId: string;
let memberDecidedRequestId: string;
let otherRequestId: string;

const asMember = () =>
  signInAsActor(testActor({ userId: memberId, capabilities: ['roster'] }));
const asManager = () =>
  signInAsActor(
    testActor({ userId: null, capabilities: ['manageAttendance'] }),
  );
const asReader = () =>
  signInAsActor(testActor({ userId: null, capabilities: ['readRecords'] }));

const json = (method: string, body: unknown) =>
  new Request('http://localhost/api/requests', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const requestBody = {
  reason: 'Doctor appointment',
  attendanceMode: 'ABSENT',
};

beforeAll(async () => {
  const user = (lastName: string) =>
    prisma.user.create({
      data: { ...uniqueUserFields(), firstName: 'Request', lastName },
    });
  memberId = (await user('RouteMember')).userId;
  otherId = (await user('RouteOther')).userId;

  // one meeting per attendance row (attendance is unique per user+meeting)
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const attendanceFor = async (
    userId: string,
    status: 'PENDING' | 'EXCUSED_ABSENCE',
  ) => {
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Request routes meeting',
        date: start,
        semesterId: await semesterIdFor(start),
        startTime: start,
        endTime: new Date(start.getTime() + 60 * 60 * 1000),
        notes: '',
        type: 'REGULAR',
      },
    });
    meetingIds.push(meeting.meetingId);
    return (
      await prisma.attendance.create({
        data: { userId, meetingId: meeting.meetingId, status },
      })
    ).attendanceId;
  };
  const requestOn = async (attendanceId: string) =>
    (
      await prisma.request.create({
        data: { attendanceId, reason: 'Existing', attendanceMode: 'ABSENT' },
      })
    ).requestId;

  memberOpenAttendanceId = await attendanceFor(memberId, 'PENDING');
  otherOpenAttendanceId = await attendanceFor(otherId, 'PENDING');
  memberPendingRequestId = await requestOn(
    await attendanceFor(memberId, 'PENDING'),
  );
  memberDecidedRequestId = await requestOn(
    await attendanceFor(memberId, 'EXCUSED_ABSENCE'),
  );
  otherRequestId = await requestOn(await attendanceFor(otherId, 'PENDING'));
});

afterEach(() => jest.restoreAllMocks());

afterAll(async () => {
  const meetingId = { in: meetingIds };
  await prisma.request.deleteMany({ where: { attendance: { meetingId } } });
  await prisma.attendance.deleteMany({ where: { meetingId } });
  await prisma.meeting.deleteMany({ where: { meetingId } });
  await prisma.user.deleteMany({
    where: { userId: { in: [memberId, otherId] } },
  });
  meetingIds = [];
});

describe('GET /api/requests', () => {
  it('returns 401 when signed out', async () => {
    signInAsActor(null);
    expect((await listRequests()).status).toBe(401);
  });

  it('returns 403 for a member', async () => {
    asMember();
    expect((await listRequests()).status).toBe(403);
  });

  it('lists every request for staff', async () => {
    asReader();
    const response = await listRequests();
    expect(response.status).toBe(200);
    const ids = (await response.json()).map((r: any) => r.requestId);
    expect(ids).toEqual(
      expect.arrayContaining([memberPendingRequestId, otherRequestId]),
    );
  });
});

describe('filing a request', () => {
  it("POST /api/requests: 403 on someone else's attendance", async () => {
    asMember();
    const response = await fileRequest(
      json('POST', { ...requestBody, attendanceId: otherOpenAttendanceId }),
    );
    expect(response.status).toBe(403);
  });

  it('POST /api/requests: a member files on their own attendance', async () => {
    asMember();
    const response = await fileRequest(
      json('POST', { ...requestBody, attendanceId: memberOpenAttendanceId }),
    );
    expect(response.status).toBe(201);
  });

  it("POST /api/attendance/[attendanceId]/requests: 403 on someone else's", async () => {
    asMember();
    const response = await fileRequestForAttendance(json('POST', requestBody), {
      params: Promise.resolve({ attendanceId: otherOpenAttendanceId }),
    });
    expect(response.status).toBe(403);
  });

  it('returns 401 when signed out', async () => {
    signInAsActor(null);
    const response = await fileRequest(
      json('POST', { ...requestBody, attendanceId: memberOpenAttendanceId }),
    );
    expect(response.status).toBe(401);
  });
});

describe('GET /api/requests/[id]', () => {
  const get = (id: string) => getRequest(json('GET', undefined), idParams(id));

  it('lets a member read their own request', async () => {
    asMember();
    expect((await get(memberPendingRequestId)).status).toBe(200);
  });

  it("returns 403 for someone else's request", async () => {
    asMember();
    expect((await get(otherRequestId)).status).toBe(403);
  });

  it("lets staff read anyone's", async () => {
    asReader();
    expect((await get(otherRequestId)).status).toBe(200);
  });
});

describe('PUT and DELETE /api/requests/[id]', () => {
  const put = (id: string) =>
    updateRequest(json('PUT', { reason: 'Updated reason' }), idParams(id));

  it('lets a member change their own pending request', async () => {
    asMember();
    expect((await put(memberPendingRequestId)).status).toBe(200);
  });

  it('refuses a member once the request is decided', async () => {
    asMember();
    expect((await put(memberDecidedRequestId)).status).toBe(403);
    expect(
      (
        await deleteRequest(
          json('DELETE', undefined),
          idParams(memberDecidedRequestId),
        )
      ).status,
    ).toBe(403);
  });

  it("refuses a member someone else's request", async () => {
    asMember();
    expect((await put(otherRequestId)).status).toBe(403);
    expect(
      (await deleteRequest(json('DELETE', undefined), idParams(otherRequestId)))
        .status,
    ).toBe(403);
  });

  it("lets a manager change anyone's request", async () => {
    asManager();
    expect((await put(memberDecidedRequestId)).status).toBe(200);
  });

  it('refuses a reader without manageAttendance', async () => {
    asReader();
    expect((await put(otherRequestId)).status).toBe(403);
  });

  it('lets a member withdraw their own pending request', async () => {
    asMember();
    const response = await deleteRequest(
      json('DELETE', undefined),
      idParams(memberPendingRequestId),
    );
    expect(response.status).toBe(200);
  });
});
