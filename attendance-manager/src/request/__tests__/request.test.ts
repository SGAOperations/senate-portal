import { RequestController } from '../request.controller';
import { prisma } from '../../lib/prisma';
import { semesterIdFor } from '@/utils/test-helpers';
import { POST } from '../../app/api/attendance/[attendanceId]/requests/route';
import { UsersService } from '@/users/users.service';
import { MeetingService } from '@/meeting/meeting.service';
import { AttendanceService } from '@/attendance/attendance.service';
import { RequestService } from '../request.service';
import {
  parseMeetingDate,
  parseMeetingDateTime,
  formatMeetingDateInput,
} from '@/meeting/meetingDateTime';

jest.setTimeout(20000);

interface Attendance {
  attendanceId: string;
  userId: string;
  meetingId: string;
  status: 'EXCUSED_ABSENCE' | 'PRESENT' | 'ABSENT';
}

interface AttendanceRequest {
  requestId: string;
  attendanceId: string;
  reason: string;
  attendanceMode: 'ONLINE' | 'IN_PERSON' | 'ABSENT';
  timeAdjustment: 'ARRIVING_LATE' | 'LEAVING_EARLY';
  isLate: boolean;
  attendance: Attendance;
}

describe('RequestController', () => {
  let testRoleId: string;
  let testUserId: string;
  let secondTestUserId: string;
  let testMeetingId: string;
  let testAttendanceId: string;
  let secondTestAtendanceId: string;
  let testRequestId: string;
  let secondTestRequestId: string;

  beforeAll(async () => {
    // Create a test role
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
    testRoleId = role.roleId;

    // Create a test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-request-user-1',
        supabaseAuthId: 'test-supabase-auth-id-1',
        nuid: '001234567',
        email: 'requestuser@example.com',
        firstName: 'Request',
        lastName: 'User',
        roleId: testRoleId,
        password: null,
      },
    });
    testUserId = user.userId;

    // Create a test user
    const secondUser = await prisma.user.create({
      data: {
        userId: 'test-request-user-2',
        supabaseAuthId: 'test-supabase-auth-id-2',
        nuid: '001234568',
        email: 'otherrequestuser@example.com',
        firstName: 'Other',
        lastName: 'Request',
        roleId: testRoleId,
        password: null,
      },
    });
    secondTestUserId = secondUser.userId;

    // Create a test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Request Meeting',
        date: parseMeetingDate('2025-08-15'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-08-15')),
        startTime: parseMeetingDateTime('2025-08-15', '13:00'),
        endTime: parseMeetingDateTime('2025-08-15', '14:00'),
        notes: 'Meeting for request tests',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    // Create a test attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });
    testAttendanceId = attendance.attendanceId;

    // Create a second test attendance record
    const secondAttendance = await prisma.attendance.create({
      data: {
        userId: secondTestUserId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });
    secondTestAtendanceId = secondAttendance.attendanceId;

    // Create a test request
    const request = await prisma.request.create({
      data: {
        attendanceId: testAttendanceId,
        reason: 'Initial test reason',
        attendanceMode: 'ONLINE',
        timeAdjustment: 'ARRIVING_LATE',
        isLate: false,
      },
    });
    testRequestId = request.requestId;

    // Create a second test request
    const secondRequest = await prisma.request.create({
      data: {
        attendanceId: secondTestAtendanceId,
        reason: 'Initial test reason',
        attendanceMode: 'IN_PERSON',
        timeAdjustment: 'LEAVING_EARLY',
        isLate: false,
      },
    });
    secondTestRequestId = secondRequest.requestId;
  });

  afterAll(async () => {
    await RequestService.deleteRequest(secondTestRequestId);
    await RequestService.deleteRequest(testRequestId);
    await AttendanceService.deleteAttendance(secondTestAtendanceId);
    await AttendanceService.deleteAttendance(testAttendanceId);
    await MeetingService.deleteMeeting(testMeetingId);
    await UsersService.deleteUser(secondTestUserId);
    await UsersService.deleteUser(testUserId);
    await UsersService.deleteRole(testRoleId);
  });

  it('should get a request by requestId', async () => {
    const request = await RequestController.getRequest(testRequestId);
    expect(request).toBeDefined();
    if (!request) throw new Error('Request not found');

    expect(request.requestId).toBe(testRequestId);
    expect(request.reason).toBe('Initial test reason');
    expect(request.attendanceId).toBe(testAttendanceId);
    expect(request.attendanceMode).toBe('ONLINE');
    expect(request.timeAdjustment).toBe('ARRIVING_LATE');
    expect(request.isLate).toBe(false);
  });

  it('should get all requests', async () => {
    const response = await RequestController.listRequest();
    const requests = await response.json();
    expect(requests).toBeDefined();
    if (!requests) throw new Error('Request not found');
    expect(requests.length).toBeGreaterThanOrEqual(2);
    requests.forEach((req: AttendanceRequest) => {
      expect(req.attendance.attendanceId).toBe(req.attendanceId);
    });
  });

  it('should create a new request', async () => {
    const newMeeting = await prisma.meeting.create({
      data: {
        name: 'Request Meeting 2',
        date: parseMeetingDate('2025-09-01'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-01')),
        startTime: parseMeetingDateTime('2025-09-01', '10:00'),
        endTime: parseMeetingDateTime('2025-09-01', '11:00'),
        notes: 'Additional meeting for requests',
        type: 'REGULAR',
      },
    });
    const attendance2 = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: newMeeting.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });
    const testAttendanceId2 = attendance2.attendanceId;

    const data = {
      attendanceId: testAttendanceId2,
      reason: 'New request reason',
      attendanceMode: 'IN_PERSON',
      timeAdjustment: 'LEAVING_EARLY',
    };
    const newRequest = await RequestController.createRequest(data);
    expect(newRequest).toBeDefined();
    expect(newRequest.reason).toBe('New request reason');
    expect(newRequest.attendanceId).toBe(testAttendanceId2);
    expect(newRequest.attendanceMode).toBe('IN_PERSON');
    expect(newRequest.timeAdjustment).toBe('LEAVING_EARLY');
    expect(newRequest.isLate).toBe(true);

    await RequestService.deleteRequest(newRequest.requestId);
    await AttendanceService.deleteAttendance(testAttendanceId2);
    await MeetingService.deleteMeeting(newMeeting.meetingId);
  });

  it('should create a request for a member who will not attend', async () => {
    const absentMeeting = await prisma.meeting.create({
      data: {
        name: 'Request Meeting Absent',
        date: parseMeetingDate('2025-09-02'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-02')),
        startTime: parseMeetingDateTime('2025-09-02', '10:00'),
        endTime: parseMeetingDateTime('2025-09-02', '11:00'),
        notes: 'Meeting the member cannot attend',
        type: 'REGULAR',
      },
    });
    const absentAttendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: absentMeeting.meetingId,
        status: 'PENDING',
      },
    });

    const newRequest = await RequestController.createRequest({
      attendanceId: absentAttendance.attendanceId,
      reason: 'I am out of town and cannot attend',
      attendanceMode: 'ABSENT',
    });

    expect(newRequest).toBeDefined();
    expect(newRequest.attendanceMode).toBe('ABSENT');
    // not attending means there is no arriving-late / leaving-early adjustment
    expect(newRequest.timeAdjustment).toBeFalsy();

    const stored = await RequestController.getRequest(newRequest.requestId);
    expect(stored?.attendanceMode).toBe('ABSENT');

    await RequestService.deleteRequest(newRequest.requestId);
    await AttendanceService.deleteAttendance(absentAttendance.attendanceId);
    await MeetingService.deleteMeeting(absentMeeting.meetingId);
  });

  it('should reject an unrecognized attendance mode', async () => {
    await expect(
      RequestController.createRequest({
        attendanceId: testAttendanceId,
        reason: 'Mode that does not exist',
        attendanceMode: 'MAYBE',
      }),
    ).rejects.toThrow('Invalid input data for creating request');
  });

  it('should reject not attending combined with a time adjustment on create', async () => {
    for (const timeAdjustment of ['ARRIVING_LATE', 'LEAVING_EARLY']) {
      await expect(
        RequestController.createRequest({
          attendanceId: testAttendanceId,
          reason: 'Not coming, but also late',
          attendanceMode: 'ABSENT',
          timeAdjustment,
        }),
      ).rejects.toThrow(
        'Not attending cannot be combined with arriving late or leaving early',
      );
    }
  });

  it('should reject switching a request with a time adjustment to not attending', async () => {
    // testRequestId is ONLINE + ARRIVING_LATE, so ABSENT alone leaves the combo
    await expect(
      RequestController.updateRequest(testRequestId, {
        attendanceMode: 'ABSENT',
      }),
    ).rejects.toThrow(
      'Not attending cannot be combined with arriving late or leaving early',
    );

    // setting both in the same update is the same combo
    await expect(
      RequestController.updateRequest(testRequestId, {
        attendanceMode: 'ABSENT',
        timeAdjustment: 'LEAVING_EARLY',
      }),
    ).rejects.toThrow(
      'Not attending cannot be combined with arriving late or leaving early',
    );

    const unchanged = await RequestController.getRequest(testRequestId);
    expect(unchanged?.attendanceMode).toBe('ONLINE');
    expect(unchanged?.timeAdjustment).toBe('ARRIVING_LATE');
  });

  it('should reject adding a time adjustment to a not attending request', async () => {
    const absentMeeting = await prisma.meeting.create({
      data: {
        name: 'Request Meeting Absent Update',
        date: parseMeetingDate('2025-09-03'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-03')),
        startTime: parseMeetingDateTime('2025-09-03', '10:00'),
        endTime: parseMeetingDateTime('2025-09-03', '11:00'),
        notes: 'Meeting for not attending update test',
        type: 'REGULAR',
      },
    });
    const absentAttendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: absentMeeting.meetingId,
        status: 'PENDING',
      },
    });
    const absentRequest = await RequestController.createRequest({
      attendanceId: absentAttendance.attendanceId,
      reason: 'I am out of town and cannot attend',
      attendanceMode: 'ABSENT',
    });

    try {
      await expect(
        RequestController.updateRequest(absentRequest.requestId, {
          timeAdjustment: 'ARRIVING_LATE',
        }),
      ).rejects.toThrow(
        'Not attending cannot be combined with arriving late or leaving early',
      );
      const stillAbsent = await RequestController.getRequest(
        absentRequest.requestId,
      );
      expect(stillAbsent?.attendanceMode).toBe('ABSENT');
      expect(stillAbsent?.timeAdjustment).toBeNull();

      // changing the mode in the same update is a valid way out of ABSENT
      const updated = await RequestController.updateRequest(
        absentRequest.requestId,
        { attendanceMode: 'IN_PERSON', timeAdjustment: 'ARRIVING_LATE' },
      );
      expect(updated.attendanceMode).toBe('IN_PERSON');
      expect(updated.timeAdjustment).toBe('ARRIVING_LATE');
    } finally {
      await RequestService.deleteRequest(absentRequest.requestId);
      await AttendanceService.deleteAttendance(absentAttendance.attendanceId);
      await MeetingService.deleteMeeting(absentMeeting.meetingId);
    }
  });

  it('should mark request as late when created within 24 hours of meeting', async () => {
    const meetingStart = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const soonMeeting = await prisma.meeting.create({
      data: {
        name: 'Soon Meeting',
        date: parseMeetingDate(formatMeetingDateInput(meetingStart)),
        semesterId: await semesterIdFor(parseMeetingDate(formatMeetingDateInput(meetingStart))),
        startTime: meetingStart,
        endTime: new Date(meetingStart.getTime() + 60 * 60 * 1000),
        notes: 'Soon meeting',
        type: 'REGULAR',
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: soonMeeting.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });

    const request = await RequestController.createRequest({
      attendanceId: attendance.attendanceId,
      reason: 'Late request test',
      attendanceMode: 'ONLINE',
    });

    expect(request.isLate).toBe(true);

    await RequestService.deleteRequest(request.requestId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
    await MeetingService.deleteMeeting(soonMeeting.meetingId);
  });

  it('should mark request as not late when meeting is more than 24 hours away', async () => {
    const meetingStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const futureMeeting = await prisma.meeting.create({
      data: {
        name: 'Far Future Meeting',
        date: parseMeetingDate(formatMeetingDateInput(meetingStart)),
        semesterId: await semesterIdFor(parseMeetingDate(formatMeetingDateInput(meetingStart))),
        startTime: meetingStart,
        endTime: new Date(meetingStart.getTime() + 60 * 60 * 1000),
        notes: 'Far future meeting',
        type: 'REGULAR',
      },
    });

    const attendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: futureMeeting.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });

    const request = await RequestController.createRequest({
      attendanceId: attendance.attendanceId,
      reason: 'On-time request',
      attendanceMode: 'ONLINE',
    });

    expect(request.isLate).toBe(false);
    await RequestService.deleteRequest(request.requestId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
    await MeetingService.deleteMeeting(futureMeeting.meetingId);
  });

  it('should update a requests reason', async () => {
    const newReason = 'Updated reason';
    const updated = await RequestController.updateRequest(testRequestId, {
      reason: newReason,
    });
    expect(updated).toBeDefined();
    expect(updated.reason).toBe(newReason);
  });

  it('should throw error when updating with invalid reason', async () => {
    await expect(
      RequestController.updateRequest(testRequestId, { reason: ' ' }),
    ).rejects.toThrow('Invalid request reason');
  });

  it('should throw error when creating with invalid data', async () => {
    await expect(RequestController.createRequest({})).rejects.toThrow(
      'Invalid input data for creating request',
    );
    await expect(
      RequestController.createRequest({ attendanceId: testAttendanceId }),
    ).rejects.toThrow('Invalid input data for creating request');
    await expect(
      RequestController.createRequest({
        attendanceId: testAttendanceId,
        reason: '',
      }),
    ).rejects.toThrow('Invalid input data for creating request');
    await expect(
      RequestController.createRequest({
        attendanceId: testAttendanceId,
        reason: 'Valid reason',
        attendanceMode: 'INVALID',
      }),
    ).rejects.toThrow('Invalid input data for creating request');
  });

  it('should delete a request', async () => {
    const newMeeting = await prisma.meeting.create({
      data: {
        name: 'Request Meeting 3',
        date: parseMeetingDate('2025-09-02'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-02')),
        startTime: parseMeetingDateTime('2025-09-02', '10:00'),
        endTime: parseMeetingDateTime('2025-09-02', '11:00'),
        notes: 'Additional meeting for requests',
        type: 'REGULAR',
      },
    });
    const attendance2 = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: newMeeting.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });
    const testAttendanceId2 = attendance2.attendanceId;

    // Create a request to delete
    const requestToDelete = await prisma.request.create({
      data: {
        attendanceId: testAttendanceId2,
        reason: 'To be deleted',
        attendanceMode: 'ONLINE',
        isLate: false,
      },
    });

    await RequestController.deleteRequest(requestToDelete.requestId);

    const deleted = await prisma.request.findUnique({
      where: { requestId: requestToDelete.requestId },
    });
    expect(deleted).toBeNull();
    await AttendanceService.deleteAttendance(testAttendanceId2);
    await MeetingService.deleteMeeting(newMeeting.meetingId);
  });
});

describe('POST /api/attendance/[attendanceId]/requests', () => {
  let routeTestRoleId: string;
  let routeTestUserId: string;
  let routeTestMeetingId: string;
  let routeTestAttendanceId: string;

  beforeAll(async () => {
    // Create test data for route endpoint tests
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
    routeTestRoleId = role.roleId;

    const user = await prisma.user.create({
      data: {
        nuid: '001234570',
        userId: 'test-request-user-3',
        supabaseAuthId: 'test-supabase-auth-id-3',
        email: 'requestrouteuser@example.com',
        firstName: 'Request',
        lastName: 'Route',
        roleId: routeTestRoleId,
        password: null,
      },
    });
    routeTestUserId = user.userId;

    const newMeeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-09-10'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-10')),
        startTime: parseMeetingDateTime('2025-09-10', '14:00'),
        endTime: parseMeetingDateTime('2025-09-10', '15:00'),
        notes: 'Meeting for route endpoint tests',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = newMeeting.meetingId;

    const attendance = await prisma.attendance.create({
      data: {
        userId: routeTestUserId,
        meetingId: routeTestMeetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });
    routeTestAttendanceId = attendance.attendanceId;
  });

  afterAll(async () => {
    await AttendanceService.deleteAttendance(routeTestAttendanceId);
    await MeetingService.deleteMeeting(routeTestMeetingId);
    await UsersService.deleteUser(routeTestUserId);
    await UsersService.deleteRole(routeTestRoleId);
  });

  it('should create a request successfully via POST endpoint', async () => {
    const requestBody = {
      reason: 'Test reason from route',
      attendanceMode: 'ONLINE',
      timeAdjustment: 'ARRIVING_LATE',
    };

    const req = new Request(
      `http://localhost/api/attendance/${routeTestAttendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: routeTestAttendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.reason).toBe('Test reason from route');
    expect(data.attendanceId).toBe(routeTestAttendanceId);
    expect(data.attendanceMode).toBe('ONLINE');
    expect(data.timeAdjustment).toBe('ARRIVING_LATE');
    expect(data.isLate).toBe(true);
    await RequestService.deleteRequest(data.requestId);
  });

  it('should create a request without timeAdjustment via POST endpoint', async () => {
    // Create a new meeting and attendance for this test since one attendance can only have one request
    const meeting2 = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting 2',
        date: parseMeetingDate('2025-09-11'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-11')),
        startTime: parseMeetingDateTime('2025-09-11', '15:00'),
        endTime: parseMeetingDateTime('2025-09-11', '16:00'),
        notes: 'Second meeting for route tests',
        type: 'REGULAR',
      },
    });

    const attendance2 = await prisma.attendance.create({
      data: {
        userId: routeTestUserId,
        meetingId: meeting2.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });

    const requestBody = {
      reason: 'Test reason without time adjustment',
      attendanceMode: 'IN_PERSON',
    };

    const req = new Request(
      `http://localhost/api/attendance/${attendance2.attendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: attendance2.attendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.reason).toBe('Test reason without time adjustment');
    expect(data.attendanceMode).toBe('IN_PERSON');
    expect(data.isLate).toBe(true);
    await RequestService.deleteRequest(data.requestId);
    await AttendanceService.deleteAttendance(attendance2.attendanceId);
    await MeetingService.deleteMeeting(meeting2.meetingId);
  });

  it('should return 400 when reason is missing', async () => {
    const requestBody = {
      attendanceMode: 'ONLINE',
    };

    const req = new Request(
      `http://localhost/api/attendance/${routeTestAttendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: routeTestAttendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('reason and attendanceMode are required');
  });

  it('should return 400 when attendanceMode is missing', async () => {
    const requestBody = {
      reason: 'Test reason',
    };

    const req = new Request(
      `http://localhost/api/attendance/${routeTestAttendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: routeTestAttendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('reason and attendanceMode are required');
  });

  it('should return 400 when both reason and attendanceMode are missing', async () => {
    const requestBody = {};

    const req = new Request(
      `http://localhost/api/attendance/${routeTestAttendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: routeTestAttendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('reason and attendanceMode are required');
  });

  it('should use attendanceId from URL params', async () => {
    // Create a new meeting and attendance for this test since one attendance can only have one request
    const meeting3 = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting 3',
        date: parseMeetingDate('2025-09-12'),
        semesterId: await semesterIdFor(parseMeetingDate('2025-09-12')),
        startTime: parseMeetingDateTime('2025-09-12', '16:00'),
        endTime: parseMeetingDateTime('2025-09-12', '17:00'),
        notes: 'Third meeting for route tests',
        type: 'REGULAR',
      },
    });

    const attendance3 = await prisma.attendance.create({
      data: {
        userId: routeTestUserId,
        meetingId: meeting3.meetingId,
        status: 'EXCUSED_ABSENCE',
      },
    });

    const requestBody = {
      reason: 'Test with attendanceId from URL',
      attendanceMode: 'ONLINE',
    };

    const req = new Request(
      `http://localhost/api/attendance/${attendance3.attendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: attendance3.attendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.attendanceId).toBe(attendance3.attendanceId);
    await RequestService.deleteRequest(data.requestId);
    await AttendanceService.deleteAttendance(attendance3.attendanceId);
    await MeetingService.deleteMeeting(meeting3.meetingId);
  });

  it('should return 500 when controller throws an error', async () => {
    const requestBody = {
      reason: 'Test reason',
      attendanceMode: 'INVALID_MODE',
    };

    const req = new Request(
      `http://localhost/api/attendance/${routeTestAttendanceId}/requests`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ attendanceId: routeTestAttendanceId });
    const response = await POST(req, { params });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Invalid input data for creating request');
  });
});
