import { MeetingService } from '../meeting.service';
import { MeetingController } from '../meeting.controller';
import { prisma } from '../../lib/prisma';
import { semesterIdFor } from '@/utils/test-helpers';
import { MeetingType } from '../../generated/prisma';
import { UsersService } from '@/users/users.service';
import { AttendanceService } from '@/attendance/attendance.service';
import { formatMeetingDateInput, parseMeetingDate } from '../meetingDateTime';

jest.setTimeout(20000);

describe('MeetingServices', () => {
  it('should create a new meeting', async () => {
    const newMeeting = await MeetingService.createMeeting(
      {
        name: 'test2',
        startTime: '8:12:56 PM',
        date: '7/30/2025',
        endTime: '8:13:15 PM',
        notes: 'notes',
        type: MeetingType.REGULAR,
      },
      [],
    );
    expect(newMeeting).toBeDefined();
    expect(newMeeting.name).toBe('test2');
    expect(newMeeting.meetingId).toBeDefined();
    expect(newMeeting.startTime.toISOString()).toBe('2025-07-31T00:12:56.000Z');
    expect(newMeeting.date.toISOString()).toBe('2025-07-30T04:00:00.000Z');
    expect(newMeeting.endTime.toISOString()).toBe('2025-07-31T00:13:15.000Z');
    expect(newMeeting.notes).toBe('notes');
    expect(newMeeting.type).toBe(MeetingType.REGULAR);
    expect(newMeeting.deletedAt).toBe(null);
  });

  it('should fetch all meetings', async () => {
    const meetings = await MeetingService.getAllMeeting();
    expect(Array.isArray(meetings)).toBe(true);
  });

  it('should fetch a meetings by id', async () => {
    const [newMeeting] = await MeetingService.getAllMeeting();
    const fetchedMeeting = await MeetingService.getMeetingById(
      newMeeting.meetingId,
    );
    expect(fetchedMeeting?.meetingId).toBe(newMeeting.meetingId);
  });

  it('should keep in-progress meetings and drop ended ones in upcoming meetings', async () => {
    const hour = 60 * 60 * 1000;
    const today = parseMeetingDate(formatMeetingDateInput(new Date()));
    const inProgress = await prisma.meeting.create({
      data: {
        name: 'In Progress Meeting',
        date: today,
        semesterId: await semesterIdFor(today),
        startTime: new Date(Date.now() - hour),
        endTime: new Date(Date.now() + hour),
        notes: 'started an hour ago, ends in an hour',
        type: MeetingType.REGULAR,
      },
    });
    const ended = await prisma.meeting.create({
      data: {
        name: 'Ended Meeting',
        date: today,
        semesterId: await semesterIdFor(today),
        startTime: new Date(Date.now() - 3 * hour),
        endTime: new Date(Date.now() - 2 * hour),
        notes: 'ended two hours ago',
        type: MeetingType.REGULAR,
      },
    });

    try {
      const upcoming = await MeetingService.getUpcomingMeetings();
      const ids = upcoming.map(
        (m) => (m as unknown as { meetingId: string }).meetingId,
      );
      expect(ids).toContain(inProgress.meetingId);
      expect(ids).not.toContain(ended.meetingId);
    } finally {
      await MeetingService.deleteMeeting(inProgress.meetingId);
      await MeetingService.deleteMeeting(ended.meetingId);
    }
  });

  it('should update a meeting', async () => {
    const [newMeeting] = await MeetingService.getAllMeeting();
    const updatedMeeting = await MeetingService.updateMeeting(
      newMeeting.meetingId,
      {
        name: 'test',
        startTime: '8:07:56 PM',
        date: '7/29/2025',
        endTime: '8:08:15 PM',
        notes: 'notes',
        type: MeetingType.FULL_BODY,
      },
    );

    expect(updatedMeeting.name).toBe('test');
    expect(updatedMeeting.meetingId).toBe(newMeeting.meetingId);
    expect(updatedMeeting.startTime.toISOString()).toBe(
      '2025-07-30T00:07:56.000Z',
    );
    expect(updatedMeeting.date.toISOString()).toBe('2025-07-29T04:00:00.000Z');
    expect(updatedMeeting.endTime.toISOString()).toBe(
      '2025-07-30T00:08:15.000Z',
    );
    expect(updatedMeeting.notes).toBe('notes');
    expect(updatedMeeting.type).toBe(MeetingType.FULL_BODY);
  });

  it('should delete a meeting', async () => {
    const [newMeeting] = await MeetingService.getAllMeeting();
    await MeetingService.deleteMeeting(newMeeting.meetingId);
    const deletedMeeting = await MeetingService.getMeetingById(
      newMeeting.meetingId,
    );
    expect(deletedMeeting).toBeNull();
  });

  it('should soft delete a meeting', async () => {
    const meeting = await MeetingService.createMeeting(
      {
        name: 'Soft Delete Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    await MeetingService.softDeleteMeeting(meeting.meetingId);

    const fetchedMeeting = await MeetingService.getMeetingById(
      meeting.meetingId,
    );
    expect(fetchedMeeting).toBeNull();

    const allMeetings = await MeetingService.getAllMeeting();
    const existsInList = allMeetings.find(
      (m) => m.meetingId === meeting.meetingId,
    );
    expect(existsInList).toBeUndefined();

    const rawMeeting = await prisma.meeting.findUnique({
      where: { meetingId: meeting.meetingId },
    });
    expect(rawMeeting).not.toBeNull();
    expect(rawMeeting?.deletedAt).not.toBeNull();
  });
});

describe('MeetingController', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should update a meeting via controller', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Controller Test Meeting',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const updateData = {
      name: 'Updated Meeting Name',
      startTime: '14:00',
      date: '2025-12-02',
      endTime: '15:00',
      notes: 'Updated notes',
      type: MeetingType.FULL_BODY,
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response).toBeDefined();
    const responseData = await response.json();
    expect(responseData.name).toBe('Updated Meeting Name');
    expect(responseData.startTime).toBe('2025-12-02T19:00:00.000Z');
    expect(responseData.date).toBe('2025-12-02T05:00:00.000Z');
    expect(responseData.endTime).toBe('2025-12-02T20:00:00.000Z');
    expect(responseData.notes).toBe('Updated notes');
    expect(responseData.type).toBe(MeetingType.FULL_BODY);

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should reject invalid meeting type via controller', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Invalid Type Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const updateData = {
      type: 'INVALID_TYPE',
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.error).toContain('Invalid meeting type');

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should allow partial updates via controller', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Partial Update Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Original notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const updateData = {
      name: 'Partially Updated Name',
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response).toBeDefined();
    const responseData = await response.json();
    expect(responseData.name).toBe('Partially Updated Name');
    expect(responseData.startTime).toBe('2025-12-01T15:00:00.000Z');
    expect(responseData.notes).toBe('Original notes');

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should handle non-existent meetingId', async () => {
    const updateData = {
      name: 'Non-existent Meeting',
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    await expect(
      MeetingController.updateMeeting(mockRequest, {
        meetingId: 'non-existent-id-12345',
      }),
    ).rejects.toThrow();
  });

  it('should handle empty request body', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Empty Body Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const updateData = {};

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response).toBeDefined();
    const responseData = await response.json();
    expect(responseData.meetingId).toBe(testMeeting.meetingId);

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should handle malformed JSON in request', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Malformed JSON Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const mockRequest = {
      json: async () => {
        throw new Error('Invalid JSON');
      },
    } as unknown as Request;

    await expect(
      MeetingController.updateMeeting(mockRequest, {
        meetingId: testMeeting.meetingId,
      }),
    ).rejects.toThrow('Invalid JSON');

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should accept valid FULL_BODY type', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Full Body Type Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const updateData = {
      type: MeetingType.FULL_BODY,
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response).toBeDefined();
    const responseData = await response.json();
    expect(responseData.type).toBe(MeetingType.FULL_BODY);

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should accept valid REGULAR type', async () => {
    const testMeeting = await MeetingService.createMeeting(
      {
        name: 'Regular Type Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.FULL_BODY,
      },
      [],
    );

    const updateData = {
      type: MeetingType.REGULAR,
    };

    const mockRequest = {
      json: async () => updateData,
    } as Request;

    const response = await MeetingController.updateMeeting(mockRequest, {
      meetingId: testMeeting.meetingId,
    });

    expect(response).toBeDefined();
    const responseData = await response.json();
    expect(responseData.type).toBe(MeetingType.REGULAR);

    await MeetingService.deleteMeeting(testMeeting.meetingId);
  });

  it('should create a meeting via controller', async () => {
    const mockRequest = {
      json: async () => ({
        name: 'Controller Create Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      }),
    } as Request;

    const response = await MeetingController.createMeeting(mockRequest);

    expect(response.status).toBe(201);
    const responseData = await response.json();
    expect(responseData.name).toBe('Controller Create Test');
    expect(responseData.notes).toBe('Test notes');
    expect(responseData.type).toBe(MeetingType.REGULAR);

    await MeetingService.deleteMeeting(responseData.meetingId);
  });

  it('should default notes to an empty string when omitted', async () => {
    const mockRequest = {
      json: async () => ({
        name: 'No Notes Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        type: MeetingType.FULL_BODY,
      }),
    } as Request;

    const response = await MeetingController.createMeeting(mockRequest);

    expect(response.status).toBe(201);
    const responseData = await response.json();
    expect(responseData.notes).toBe('');

    await MeetingService.deleteMeeting(responseData.meetingId);
  });

  it('should reject a create request with missing required fields', async () => {
    const mockRequest = {
      json: async () => ({ name: 'Missing Fields', type: MeetingType.REGULAR }),
    } as Request;

    const response = await MeetingController.createMeeting(mockRequest);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(Object.keys(responseData.fieldErrors)).toEqual(
      expect.arrayContaining(['date', 'startTime', 'endTime']),
    );
  });

  it('should reject a create request with an invalid meeting type', async () => {
    const mockRequest = {
      json: async () => ({
        name: 'Bad Type',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        type: 'INVALID_TYPE',
      }),
    } as Request;

    const response = await MeetingController.createMeeting(mockRequest);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.fieldErrors.type).toBeDefined();
  });

  it('should reject a create request with non-array attendeeIds', async () => {
    const mockRequest = {
      json: async () => ({
        name: 'Bad Attendees',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        type: MeetingType.REGULAR,
        attendeeIds: 'not-an-array',
      }),
    } as Request;

    const response = await MeetingController.createMeeting(mockRequest);

    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.fieldErrors.attendeeIds).toBeDefined();
  });

  it('should return users associated with a meeting and exclude users not associated', async () => {
    const newMeeting = await MeetingService.createMeeting(
      {
        name: 'test2',
        startTime: '8:12:56 PM',
        date: '7/30/2025',
        endTime: '8:13:15 PM',
        notes: 'notes',
        type: MeetingType.REGULAR,
      },
      [],
    );
    const testMeetingId = newMeeting.meetingId;
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
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
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.userId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
        request: {},
      },
    });
    const response = await MeetingController.getUsers({
      meetingId: testMeetingId,
    });
    const responseData = await response.json();
    expect(responseData).toHaveLength(1);
    expect(responseData[0].userId).toBe(user.userId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
    await prisma.user.delete({ where: { userId: user.userId } });
    await prisma.user.delete({ where: { userId: user2.userId } });
    await prisma.role.delete({ where: { roleId: role.roleId } });
    await MeetingService.deleteMeeting(newMeeting.meetingId);
  });

  it('should return users associated with a meeting', async () => {
    const newMeeting = await MeetingService.createMeeting(
      {
        name: 'test2',
        startTime: '8:12:56 PM',
        date: '7/30/2025',
        endTime: '8:13:15 PM',
        notes: 'notes',
        type: MeetingType.REGULAR,
      },
      [],
    );
    const testMeetingId = newMeeting.meetingId;
    const role = await prisma.role.create({ data: { roleType: 'MEMBER' } });
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
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.userId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
        request: {},
      },
    });
    const attendance2 = await prisma.attendance.create({
      data: {
        userId: user2.userId,
        meetingId: testMeetingId,
        status: 'EXCUSED_ABSENCE',
        request: {},
      },
    });
    const response = await MeetingController.getUsers({
      meetingId: testMeetingId,
    });
    const responseData = await response.json();
    expect(responseData).toHaveLength(2);
    expect(responseData[0].userId).toBe(user.userId);
    expect(responseData[1].userId).toBe(user2.userId);
    await AttendanceService.deleteAttendance(attendance.attendanceId);
    await AttendanceService.deleteAttendance(attendance2?.attendanceId);
    await prisma.user.delete({ where: { userId: user.userId } });
    await prisma.user.delete({ where: { userId: user2.userId } });
    await prisma.role.delete({ where: { roleId: role.roleId } });
    await MeetingService.deleteMeeting(newMeeting.meetingId);
  });

  it('should soft delete a meeting', async () => {
    const meeting = await MeetingService.createMeeting(
      {
        name: 'Controller Delete Test',
        startTime: '10:00',
        date: '2025-12-01',
        endTime: '11:00',
        notes: 'Test notes',
        type: MeetingType.REGULAR,
      },
      [],
    );

    const response = await MeetingController.deleteMeeting({
      meetingId: meeting.meetingId,
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.message).toContain('soft deleted');

    const fetched = await MeetingService.getMeetingById(meeting.meetingId);
    expect(fetched).toBeNull();
  });
});
