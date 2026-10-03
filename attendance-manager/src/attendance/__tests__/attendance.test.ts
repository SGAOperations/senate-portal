import { AttendanceController } from '../attendance.controller';
import { prisma } from '../../lib/prisma';
import dotenv from 'dotenv';
import { UsersService } from '@/users/users.service';
import { MeetingService } from '@/meeting/meeting.service';
import { AttendanceService } from '../attendance.service';
import { RequestService } from '@/request/request.service';

dotenv.config();
jest.setTimeout(20000);

describe('AttendanceController', () => {
  let testUserId: string;
  let testUser2Id: string;
  let testMeetingId: string;
  let testMeeting2Id: string;
  let testAttendanceId: string;
  let testMeeting3Id: string;
  let testUser3Id: string;
  let roleId: string;

  beforeAll(async () => {
    // Test role
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
    roleId = role.roleId;
    // Test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-attendance-user-1',
        supabaseAuthId: 'test-supabase-auth-id-1',
        nuid: '001234569',
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        roleId: role.roleId,
        password: null,
      },
    });
    testUserId = user.userId;

    const user2 = await prisma.user.create({
      data: {
        userId: 'test-attendance-user-2',
        supabaseAuthId: 'test-supabase-auth-id-2',
        nuid: '001234570',
        email: 'testuser2@example.com',
        firstName: 'Test2',
        lastName: 'User2',
        roleId: role.roleId,
        password: null,
      },
    });
    testUser2Id = user2.userId;

    // Test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Test Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    const meeting2 = await prisma.meeting.create({
      data: {
        name: 'Test Meeting 2',
        date: '2025-10-04',
        startTime: '9:00',
        endTime: '10:00',
        notes: 'Test notes 2',
        type: 'FULL_BODY',
      },
    });
    testMeeting2Id = meeting2.meetingId;

    const meeting3 = await prisma.meeting.create({
      data: {
        name: 'Test Meeting 3',
        date: '2025-10-05',
        startTime: '11:00',
        endTime: '12:00',
        notes: 'Test notes 3',
        type: 'FULL_BODY',
      },
    });
    testMeeting3Id = meeting3.meetingId;

    const user3 = await prisma.user.create({
      data: {
        userId: 'test-attendance-user-3',
        supabaseAuthId: 'test-supabase-auth-id-3',
        nuid: '001234571',
        email: 'testuser3@example.com',
        firstName: 'Test3',
        lastName: 'User3',
        roleId: role.roleId,
        password: null,
      },
    });
    testUser3Id = user3.userId;

    // Create initial attendance record
    const attendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
        request: {},
      },
    });
    testAttendanceId = attendance.attendanceId;

    // Create attendance record for testUser2Id
    await prisma.attendance.create({
      data: {
        userId: testUser2Id,
        meetingId: testMeeting2Id,
        status: 'PRESENT',
      },
    });

    // Create a request for user
    await prisma.request.create({
      data: {
        attendanceId: testAttendanceId,
        reason: 'Initial test reason',
        attendanceMode: 'ONLINE',
        timeAdjustment: 'ARRIVING_LATE',
      },
    });
  });

  afterAll(async () => {
    const requests = await prisma.request.findMany({
      where: { attendanceId: testAttendanceId },
    });
    for (const req of requests) {
      await RequestService.deleteRequest(req.requestId);
    }
    await AttendanceService.deleteAttendance(testAttendanceId);

    await MeetingService.deleteMeeting(testMeetingId);
    await MeetingService.deleteMeeting(testMeeting2Id);
    await MeetingService.deleteMeeting(testMeeting3Id);

    await UsersService.deleteUser(testUserId);
    await UsersService.deleteUser(testUser2Id);
    await UsersService.deleteUser(testUser3Id);

    await UsersService.deleteRole(roleId);
  });

  it('should get attendance by userId', async () => {
    const attendance = await AttendanceController.getUserAttendance(testUserId);
    expect(attendance).toBeDefined();
    expect(attendance.length).toBe(1);
    expect(attendance[0].userId).toBe(testUserId);

    const attendance2 =
      await AttendanceController.getUserAttendance(testUser2Id);
    expect(attendance2).toBeDefined();
    expect(attendance2.length).toBe(1);
    expect(attendance2[0].userId).toBe(testUser2Id);
  });

  it('should get request with status by userId ', async () => {
    const attendance = await AttendanceController.getRequestsByUser(testUserId);
    expect(attendance).toBeDefined();
    const firstRequest = attendance[0];
    expect(firstRequest.AttendanceStatus).toBe('EXCUSED_ABSENCE');
  });

  it('should get attendance by meetingId', async () => {
    const attendance =
      await AttendanceController.getMeetingAttendance(testMeetingId);
    expect(attendance).toBeDefined();
    expect(attendance.length).toBe(1);
    expect(attendance[0].meetingId).toBe(testMeetingId);

    const attendance2 =
      await AttendanceController.getMeetingAttendance(testMeeting2Id);
    expect(attendance2).toBeDefined();
    expect(attendance2.length).toBe(1);
    expect(attendance2[0].meetingId).toBe(testMeeting2Id);
  });

  it('should create a new attendance record', async () => {
    const data = {
      userId: testUserId,
      meetingId: testMeeting2Id,
      status: 'PRESENT',
    };
    const newAttendance = await AttendanceController.createAttendance(data);
    expect(newAttendance).toBeDefined();
    expect(newAttendance.status).toBe('PRESENT');

    const attendance2 =
      await AttendanceController.getMeetingAttendance(testMeeting2Id);
    expect(attendance2).toBeDefined();
    expect(attendance2.length).toBe(2);
    await AttendanceService.deleteAttendance(newAttendance.attendanceId);
  });

  it('checks in a member who was not on the meeting roster without changing existing attendance', async () => {
    const existingAttendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: testMeeting3Id,
        status: 'EXCUSED_ABSENCE',
      },
    });

    const lateMember = await UsersService.getUserByNUID('001234571');
    expect(lateMember?.userId).toBe(testUser3Id);
    expect(await UsersService.getUserByNUID('999999999')).toBeNull();

    await AttendanceService.upsertAttendance(
      testUser3Id,
      testMeeting3Id,
      'PRESENT',
    );

    const meetingAttendance =
      await AttendanceController.getMeetingAttendance(testMeeting3Id);
    expect(meetingAttendance).toHaveLength(2);
    expect(
      meetingAttendance.find((record) => record.userId === testUser3Id)?.status,
    ).toBe('PRESENT');
    expect(
      meetingAttendance.find((record) => record.userId === testUserId)?.status,
    ).toBe('EXCUSED_ABSENCE');

    await AttendanceController.updateMeetingAttendees(testMeeting3Id, [
      testUserId,
      testUser3Id,
    ]);
    const afterRosterSave =
      await AttendanceController.getMeetingAttendance(testMeeting3Id);
    expect(
      afterRosterSave.find((record) => record.userId === testUserId)?.status,
    ).toBe('EXCUSED_ABSENCE');
    expect(
      afterRosterSave.find((record) => record.userId === testUser3Id)?.status,
    ).toBe('PRESENT');

    await AttendanceService.deleteAttendance(existingAttendance.attendanceId);
    const lateMemberAttendance = afterRosterSave.find(
      (record) => record.userId === testUser3Id,
    );
    if (lateMemberAttendance) {
      await AttendanceService.deleteAttendance(
        lateMemberAttendance.attendanceId,
      );
    }
  });

  it('should update attendance status', async () => {
    const updateData = { status: 'UNEXCUSED_ABSENCE' };
    const updated = await AttendanceController.updateAttendance(
      testAttendanceId,
      updateData,
    );
    expect(updated).toBeDefined();
    expect(updated.status).toBe('UNEXCUSED_ABSENCE');
  });

  it('should throw error for invalid status update', async () => {
    await expect(
      AttendanceController.updateAttendance(testAttendanceId, {
        status: 'INVALID_STATUS',
      }),
    ).rejects.toThrow('Invalid attendance status');
  });

  it('should delete attendance record', async () => {
    // Create record to delete
    const attendance = await prisma.attendance.create({
      data: {
        userId: testUser2Id,
        meetingId: testMeetingId,
        status: 'PRESENT',
      },
    });

    await AttendanceController.deleteAttendance(attendance.attendanceId);

    const deleted = await prisma.attendance.findUnique({
      where: { attendanceId: attendance.attendanceId },
    });
    expect(deleted).toBeNull();
  });

  it('should throw error if requestId does not exist', async () => {
    await expect(
      AttendanceController.updateAttendanceStatus('nonexistent-id', 'PRESENT'),
    ).rejects.toThrow('Request or related attendance record not found');
  });

  it('should throw error for invalid attendance status', async () => {
    // Create a new attendance + request pair
    const attendance = await prisma.attendance.create({
      data: {
        userId: testUserId,
        meetingId: testMeeting3Id,
        status: 'PRESENT',
      },
    });
    const request = await prisma.request.create({
      data: {
        attendanceId: attendance.attendanceId,
        reason: 'Test invalid status',
        attendanceMode: 'IN_PERSON',
      },
    });

    await expect(
      AttendanceController.updateAttendanceStatus(request.requestId, 'INVALID'),
    ).rejects.toThrow('Invalid attendance status');
    await RequestService.deleteRequest(request.requestId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
  });

  it('should update attendance status given a valid requestId', async () => {
    // Create a new attendance + request pair
    const attendance = await prisma.attendance.create({
      data: {
        userId: testUser3Id,
        meetingId: testMeetingId,
        status: 'PRESENT',
      },
    });

    const request = await prisma.request.create({
      data: {
        attendanceId: attendance.attendanceId,
        reason: 'Test update status',
        attendanceMode: 'ONLINE',
      },
    });

    const updatedAttendance = await AttendanceController.updateAttendanceStatus(
      request.requestId,
      'EXCUSED_ABSENCE',
    );

    expect(updatedAttendance).toBeDefined();
    expect(updatedAttendance.status).toBe('EXCUSED_ABSENCE');

    const updated = await prisma.attendance.findUnique({
      where: { attendanceId: attendance.attendanceId },
    });

    expect(updated?.status).toBe('EXCUSED_ABSENCE');
    await RequestService.deleteRequest(request.requestId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
  });
});

describe('getRemainingUnexcusedAbsences', () => {
  let testUser4Id: string;
  let testUser5Id: string;
  let regularMeeting1Id: string;
  let regularMeeting2Id: string;
  let regularMeeting3Id: string;
  let regularMeeting4Id: string;
  let fullBodyMeeting1Id: string;
  let fullBodyMeeting2Id: string;
  let roleId: string;
  let testRequest1Id: string;
  let testRequest2Id: string;
  let testRequest3Id: string;
  let testRequest4Id: string;
  let testRequest5Id: string;
  let testRequest6Id: string;
  let testRequest7Id: string;
  let testRequest8Id: string;
  let testRequest9Id: string;

  beforeAll(async () => {
    // Create a new user for these tests
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
    roleId = role.roleId;
    const user4 = await prisma.user.create({
      data: {
        nuid: '001234572',
        userId: 'test-attendance-user-4',
        supabaseAuthId: 'test-supabase-auth-id-4',
        email: 'testuser4@example.com',
        firstName: 'Test4',
        lastName: 'User4',
        roleId: role.roleId,
        password: null,
      },
    });
    testUser4Id = user4.userId;

    const user5 = await prisma.user.create({
      data: {
        nuid: '001234573',
        userId: 'test-attendance-user-5',
        supabaseAuthId: 'test-supabase-auth-id-5',
        email: 'testuser5@example.com',
        firstName: 'Test5',
        lastName: 'User5',
        roleId: role.roleId,
        password: null,
      },
    });
    testUser5Id = user5.userId;

    // Create regular meetings
    const regular1 = await prisma.meeting.create({
      data: {
        name: 'Regular Meeting 1',
        date: '2025-01-01',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    regularMeeting1Id = regular1.meetingId;

    const regular2 = await prisma.meeting.create({
      data: {
        name: 'Regular Meeting 2',
        date: '2025-01-08',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    regularMeeting2Id = regular2.meetingId;

    const regular3 = await prisma.meeting.create({
      data: {
        name: 'Regular Meeting 3',
        date: '2025-01-15',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    regularMeeting3Id = regular3.meetingId;

    const regular4 = await prisma.meeting.create({
      data: {
        name: 'Regular Meeting 4',
        date: '2025-01-22',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    regularMeeting4Id = regular4.meetingId;

    // Create full-body meetings
    const fullBody1 = await prisma.meeting.create({
      data: {
        name: 'Full Body Meeting 1',
        date: '2025-02-01',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'FULL_BODY',
      },
    });
    fullBodyMeeting1Id = fullBody1.meetingId;

    const fullBody2 = await prisma.meeting.create({
      data: {
        name: 'Full Body Meeting 2',
        date: '2025-02-08',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'FULL_BODY',
      },
    });
    fullBodyMeeting2Id = fullBody2.meetingId;
  });
  afterAll(async () => {
    await AttendanceService.deleteAttendance(testRequest1Id);
    await AttendanceService.deleteAttendance(testRequest2Id);
    await AttendanceService.deleteAttendance(testRequest3Id);
    await AttendanceService.deleteAttendance(testRequest4Id);
    await AttendanceService.deleteAttendance(testRequest5Id);
    await AttendanceService.deleteAttendance(testRequest6Id);
    await AttendanceService.deleteAttendance(testRequest7Id);
    await AttendanceService.deleteAttendance(testRequest8Id);
    await AttendanceService.deleteAttendance(testRequest9Id);
    await MeetingService.deleteMeeting(regularMeeting1Id);
    await MeetingService.deleteMeeting(regularMeeting2Id);
    await MeetingService.deleteMeeting(regularMeeting3Id);
    await MeetingService.deleteMeeting(regularMeeting4Id);
    await MeetingService.deleteMeeting(fullBodyMeeting1Id);
    await MeetingService.deleteMeeting(fullBodyMeeting2Id);

    await UsersService.deleteUser(testUser4Id);
    await UsersService.deleteUser(testUser5Id);

    await UsersService.deleteRole(roleId);
  });

  it('should return full allowance when user has no unexcused absences', async () => {
    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser4Id);

    expect(result).toBeDefined();
    expect(result.regular.used).toBe(0);
    expect(result.regular.allowed).toBe(2);
    expect(result.regular.remaining).toBe(2);
    expect(result.fullBody.used).toBe(0);
    expect(result.fullBody.allowed).toBe(0);
    expect(result.fullBody.remaining).toBe(0);
  });

  it('should correctly count remaining regular meeting unexcused absences', async () => {
    // Create 2 unexcused absences for regular meetings
    const atten1 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: regularMeeting1Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest1Id = atten1.attendanceId;

    const atten2 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: regularMeeting2Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest2Id = atten2.attendanceId;

    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser4Id);

    expect(result.regular.used).toBe(2);
    expect(result.regular.allowed).toBe(2);
    expect(result.regular.remaining).toBe(0);
    expect(result.fullBody.used).toBe(0);
    expect(result.fullBody.remaining).toBe(0);
  });

  it('should correctly count remaining full-body meeting unexcused absences', async () => {
    // Create 1 unexcused absence for full-body meeting
    const atten1 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: fullBodyMeeting1Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest3Id = atten1.attendanceId;
    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser4Id);

    expect(result.fullBody.used).toBe(1);
    expect(result.fullBody.allowed).toBe(0);
    expect(result.fullBody.remaining).toBe(0);
    // Regular should still be 2 used (from previous test)
    expect(result.regular.used).toBe(2);
    expect(result.regular.remaining).toBe(0);
  });

  it('should show 0 remaining when user reaches max unexcused absences', async () => {
    // Add one more regular unexcused absence to reach max (3)
    const atten1 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: regularMeeting3Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest4Id = atten1.attendanceId;

    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser4Id);

    expect(result.regular.used).toBe(3);
    expect(result.regular.allowed).toBe(2);
    expect(result.regular.remaining).toBe(0);
    expect(result.fullBody.used).toBe(1);
    expect(result.fullBody.remaining).toBe(0);
  });

  it('should not return negative remaining when exceeding limits', async () => {
    // Add one more regular unexcused absence to exceed limit©
    const atten1 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: regularMeeting4Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest5Id = atten1.attendanceId;

    // Add one more full-body unexcused absence to exceed limit
    const atten2 = await prisma.attendance.create({
      data: {
        userId: testUser4Id,
        meetingId: fullBodyMeeting2Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest6Id = atten2.attendanceId;

    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser4Id);

    expect(result.regular.used).toBe(4);
    expect(result.regular.allowed).toBe(2);
    expect(result.regular.remaining).toBe(0);
    expect(result.fullBody.used).toBe(2);
    expect(result.fullBody.allowed).toBe(0);
    expect(result.fullBody.remaining).toBe(0);
  });

  it('should only count UNEXCUSED_ABSENCE status, not EXCUSED_ABSENCE or PRESENT', async () => {
    // Create excused absences and present records (should not count)
    const atten1 = await prisma.attendance.create({
      data: {
        userId: testUser5Id,
        meetingId: regularMeeting1Id,
        status: 'EXCUSED_ABSENCE',
      },
    });
    testRequest7Id = atten1.attendanceId;

    const atten2 = await prisma.attendance.create({
      data: {
        userId: testUser5Id,
        meetingId: regularMeeting2Id,
        status: 'PRESENT',
      },
    });
    testRequest8Id = atten2.attendanceId;

    // Create one unexcused absence (should count)
    const atten3 = await prisma.attendance.create({
      data: {
        userId: testUser5Id,
        meetingId: regularMeeting3Id,
        status: 'UNEXCUSED_ABSENCE',
      },
    });
    testRequest9Id = atten3.attendanceId;

    const result =
      await AttendanceController.getRemainingUnexcusedAbsences(testUser5Id);

    expect(result.regular.used).toBe(1);
    expect(result.regular.allowed).toBe(2);
    expect(result.regular.remaining).toBe(1);
    expect(result.fullBody.used).toBe(0);
    expect(result.fullBody.remaining).toBe(0);
  });

  it('should throw error for invalid userId', async () => {
    await expect(
      AttendanceController.getRemainingUnexcusedAbsences(''),
    ).rejects.toThrow('Invalid or missing userId');

    await expect(
      AttendanceController.getRemainingUnexcusedAbsences(null as any),
    ).rejects.toThrow('Invalid or missing userId');

    await expect(
      AttendanceController.getRemainingUnexcusedAbsences(123 as any),
    ).rejects.toThrow('Invalid or missing userId');
  });
});
