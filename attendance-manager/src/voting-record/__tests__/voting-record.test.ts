import { VotingRecordService } from '../voting-record.service';
import { VotingRecordController } from '../voting-record.controller';
import { prisma } from '../../lib/prisma';
import { VotingService } from '@/voting/voting.service';
import { MeetingService } from '@/meeting/meeting.service';
import { UsersService } from '@/users/users.service';

jest.setTimeout(20000);

describe('VotingRecordService', () => {
  let testMeetingId: string;
  let testVotingEventId: string;
  let testUserId: string;
  let testUserId2: string;
  let testVotingRecordId: string;
  let testRoleId: string;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    // Create test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-1',
        supabaseAuthId: 'test-supabase-auth-id-1',
        nuid: '001234567',
        email: 'votingrecorduser@example.com',
        firstName: 'Test',
        lastName: 'User',
        roleId: role.roleId,
        password: null,
      },
    });
    testUserId = user.userId;

    // Create second test user (for create/fetch tests to avoid duplicate-vote conflicts)
    const user2 = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-1b',
        supabaseAuthId: 'test-supabase-auth-id-1b',
        nuid: '001234572',
        email: 'votingrecorduser1b@example.com',
        firstName: 'Test1b',
        lastName: 'User1b',
        roleId: role.roleId,
        password: null,
      },
    });
    testUserId2 = user2.userId;

    // Create test meeting
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

    // Create test voting event
    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Test Voting Event',
        voteType: 'YES_NO',
      },
    });
    testVotingEventId = votingEvent.votingEventId;

    // Create test voting record
    const votingRecord = await prisma.votingRecord.create({
      data: {
        votingEventId: testVotingEventId,
        userId: testUserId,
        result: 'YES',
        updatedBy: 'test-user',
      },
    });
    testVotingRecordId = votingRecord.votingRecordId;
  });

  afterAll(async () => {
    await VotingRecordService.deleteVotingRecord(testVotingRecordId);
    await VotingService.deleteVotingEvent(testVotingEventId);
    await MeetingService.deleteMeeting(testMeetingId);
    await UsersService.deleteUser(testUserId2);
    await UsersService.deleteUser(testUserId);
    await UsersService.deleteRole(testRoleId);
  });

  it('should create a new voting record', async () => {
    const newVotingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: testVotingEventId,
      userId: testUserId2,
      result: 'NO',
      updatedBy: 'test-user-2',
    });

    expect(newVotingRecord).toBeDefined();
    expect(newVotingRecord.result).toBe('NO');
    expect(newVotingRecord.votingRecordId).toBeDefined();
    expect(newVotingRecord.votingEventId).toBe(testVotingEventId);
    expect(newVotingRecord.userId).toBe(testUserId2);
    expect(newVotingRecord.updatedBy).toBe('test-user-2');
    expect(newVotingRecord.createdAt).toBeDefined();
    expect(newVotingRecord.updatedAt).toBeDefined();
    await VotingRecordService.deleteVotingRecord(
      newVotingRecord.votingRecordId,
    );
  });

  it('should not allow a user to vote twice for the same event', async () => {
    await expect(
      VotingRecordService.createVotingRecord({
        votingEventId: testVotingEventId,
        userId: testUserId,
        result: 'YES',
      })
    ).rejects.toThrow('User has already voted for this event');
  });

  it('should fetch all voting records', async () => {
    const votingRecords = await VotingRecordService.getAllVotingRecords();
    expect(Array.isArray(votingRecords)).toBe(true);
    expect(votingRecords.length).toBeGreaterThan(0);
  });

  it('should fetch voting records by voting event', async () => {
    // Create another voting record for the same voting event using a second user
    const votingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: testVotingEventId,
      userId: testUserId2,
      result: 'ABSTAIN',
    });

    const votingRecords =
      await VotingRecordService.getVotingRecordsByVotingEvent(
        testVotingEventId,
      );
    expect(Array.isArray(votingRecords)).toBe(true);
    expect(votingRecords.length).toBeGreaterThanOrEqual(2);
    votingRecords.forEach((record) => {
      expect(record.votingEventId).toBe(testVotingEventId);
    });
    await VotingRecordService.deleteVotingRecord(votingRecord.votingRecordId);
  });

  it('should include votingEvent and meeting in responses', async () => {
    const votingRecords = await VotingRecordService.getAllVotingRecords();
    const firstRecord = votingRecords[0];
    expect(firstRecord.votingEvent).toBeDefined();
    expect(firstRecord.votingEvent.votingEventId).toBeDefined();
    expect(firstRecord.votingEvent.meeting).toBeDefined();
    expect(firstRecord.votingEvent.meeting.meetingId).toBeDefined();
  });

  it('should update a voting record', async () => {
    const updated = await VotingRecordService.updateVotingRecord({
      votingRecordId: testVotingRecordId,
      result: 'NO',
      updatedBy: 'admin-user',
    });
    expect(updated.result).toBe('NO');
    expect(updated.updatedBy).toBe('admin-user');
    expect(updated.votingEvent).toBeDefined();
    expect(updated.votingEvent.meeting).toBeDefined();

    const restored = await VotingRecordService.updateVotingRecord({
      votingRecordId: testVotingRecordId,
      result: 'YES',
    });
    expect(restored.result).toBe('YES');
  });
});

describe('VotingRecordController', () => {
  let testMeetingId: string;
  let testVotingEventId: string;
  let testUserId: string;
  let testUserId2: string;
  let testVotingRecordId: string;
  let testRoleId: string;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    // Create test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-2',
        supabaseAuthId: 'test-supabase-auth-id-2',
        nuid: '001234568',
        email: 'votingrecorduser2@example.com',
        firstName: 'Test2',
        lastName: 'User2',
        roleId: role.roleId,
        password: null,
      },
    });
    testUserId = user.userId;

    // Create second test user (for POST/GET tests to avoid duplicate-vote conflicts)
    const user2 = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-2b',
        supabaseAuthId: 'test-supabase-auth-id-2b',
        nuid: '001234573',
        email: 'votingrecorduser2b@example.com',
        firstName: 'Test2b',
        lastName: 'User2b',
        roleId: role.roleId,
        password: null,
      },
    });
    testUserId2 = user2.userId;

    // Create test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Controller Test Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    // Create test voting event
    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Controller Test Voting Event',
        voteType: 'YES_NO',
      },
    });
    testVotingEventId = votingEvent.votingEventId;

    // Create test voting record
    const votingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: testVotingEventId,
      userId: testUserId,
      result: 'YES',
    });
    testVotingRecordId = votingRecord.votingRecordId;
  });

  afterAll(async () => {
    await VotingRecordService.deleteVotingRecord(testVotingRecordId);
    await VotingService.deleteVotingEvent(testVotingEventId);
    await MeetingService.deleteMeeting(testMeetingId);
    await UsersService.deleteUser(testUserId2);
    await UsersService.deleteUser(testUserId);
    await UsersService.deleteRole(testRoleId);
  });

  describe('GET ALL', () => {
    it('should return all voting records', async () => {
      const response = await VotingRecordController.getAllVotingRecords();
      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThan(0);
    });
  });

  describe('GET by VotingEvent', () => {
    it('should return voting records filtered by voting event', async () => {
      // Create another voting record for the same voting event using a second user
      const votingRecord = await VotingRecordService.createVotingRecord({
        votingEventId: testVotingEventId,
        userId: testUserId2,
        result: 'NO',
      });

      const response =
        await VotingRecordController.getVotingRecordsByVotingEvent({
          votingEventId: testVotingEventId,
        });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThanOrEqual(2);
      responseData.forEach((record: any) => {
        expect(record.votingEventId).toBe(testVotingEventId);
      });
      await VotingRecordService.deleteVotingRecord(votingRecord.votingRecordId);
    });

    it('should return empty array for non-existent voting event', async () => {
      const response =
        await VotingRecordController.getVotingRecordsByVotingEvent({
          votingEventId: 'non-existent-voting-event-id',
        });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(0);
    });
  });

  describe('POST', () => {
    it('should create a new voting record via controller', async () => {
      const createData = {
        votingEventId: testVotingEventId,
        userId: testUserId2,
        result: 'YES',
        updatedBy: 'test-user',
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response =
        await VotingRecordController.createVotingRecord(mockRequest);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.result).toBe('YES');
      expect(responseData.votingEventId).toBe(testVotingEventId);
      expect(responseData.userId).toBe(testUserId2);
      expect(responseData.votingRecordId).toBeDefined();
      expect(responseData.updatedBy).toBe('test-user');
      await VotingRecordService.deleteVotingRecord(responseData.votingRecordId);
    });

    it('should reject missing required fields', async () => {
      const createData = {
        result: 'YES',
        // Missing votingEventId and userId
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response =
        await VotingRecordController.createVotingRecord(mockRequest);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Missing required fields');
    });

    it('should reject invalid field types', async () => {
      const createData = {
        votingEventId: 123, // Should be string
        userId: testUserId,
        result: 'YES',
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response =
        await VotingRecordController.createVotingRecord(mockRequest);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Invalid field types');
    });

    it('should handle optional updatedBy field', async () => {
      const createData = {
        votingEventId: testVotingEventId,
        userId: testUserId2,
        result: 'NO',
        // updatedBy is optional
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response =
        await VotingRecordController.createVotingRecord(mockRequest);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.updatedBy).toBeNull();
      await VotingRecordService.deleteVotingRecord(responseData.votingRecordId);
    });

    it('should return 409 when user has already voted for this event', async () => {
      const createData = {
        votingEventId: testVotingEventId,
        userId: testUserId,
        result: 'NO',
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response =
        await VotingRecordController.createVotingRecord(mockRequest);

      expect(response.status).toBe(409);
      const responseData = await response.json();
      expect(responseData.error).toContain('already voted');
    });
  });

  describe('PATCH updateVotingRecord', () => {
    it('should update result for an ongoing event', async () => {
      const mockRequest = {
        json: async () => ({ result: 'NO', updatedBy: 'admin' }),
      } as Request;

      const response = await VotingRecordController.updateVotingRecord(
        mockRequest,
        { votingRecordId: testVotingRecordId },
      );
      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.result).toBe('NO');

      const restoreRequest = {
        json: async () => ({ result: 'YES' }),
      } as Request;
      const restore = await VotingRecordController.updateVotingRecord(
        restoreRequest,
        { votingRecordId: testVotingRecordId },
      );
      expect(restore.status).toBe(200);
      const restored = await restore.json();
      expect(restored.result).toBe('YES');
    });

    it('should return 404 for non-existent voting record', async () => {
      const mockRequest = {
        json: async () => ({ result: 'NO' }),
      } as Request;
      const response = await VotingRecordController.updateVotingRecord(
        mockRequest,
        { votingRecordId: '00000000-0000-0000-0000-000000000000' },
      );
      expect(response.status).toBe(404);
    });

    it('should return 400 when voting event is completed', async () => {
      await prisma.votingEvent.update({
        where: { votingEventId: testVotingEventId },
        data: { deletedAt: new Date() },
      });
      try {
        const mockRequest = {
          json: async () => ({ result: 'NO' }),
        } as Request;
        const response = await VotingRecordController.updateVotingRecord(
          mockRequest,
          { votingRecordId: testVotingRecordId },
        );
        expect(response.status).toBe(400);
        const responseData = await response.json();
        expect(responseData.error).toContain('completed');
      } finally {
        await prisma.votingEvent.update({
          where: { votingEventId: testVotingEventId },
          data: { deletedAt: null },
        });
      }
    });

    it('should return 403 for secret ballot event', async () => {
      const event = await prisma.votingEvent.create({
        data: {
          meetingId: testMeetingId,
          name: 'Secret ballot patch test',
          voteType: 'SECRET_BALLOT',
          options: ['Yes', 'No'],
        },
      });
      const rec = await VotingRecordService.createVotingRecord({
        votingEventId: event.votingEventId,
        userId: testUserId,
        result: 'Yes',
      });
      const mockRequest = {
        json: async () => ({ result: 'No' }),
      } as Request;
      const response = await VotingRecordController.updateVotingRecord(
        mockRequest,
        { votingRecordId: rec.votingRecordId },
      );
      expect(response.status).toBe(403);
      await VotingRecordService.deleteVotingRecord(rec.votingRecordId);
      await VotingService.deleteVotingEvent(event.votingEventId);
    });

    it('should return 400 for invalid result', async () => {
      const mockRequest = {
        json: async () => ({ result: 'NOT_A_VALID_VOTE' }),
      } as Request;
      const response = await VotingRecordController.updateVotingRecord(
        mockRequest,
        { votingRecordId: testVotingRecordId },
      );
      expect(response.status).toBe(400);
    });

    it('should return 400 when result is missing', async () => {
      const mockRequest = {
        json: async () => ({}),
      } as Request;
      const response = await VotingRecordController.updateVotingRecord(
        mockRequest,
        { votingRecordId: testVotingRecordId },
      );
      expect(response.status).toBe(400);
    });
  });
});

describe('GET /api/voting-record', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;
  let routeTestUserId: string;
  let routeTestVotingRecordId: string;
  let routeRoleId: string;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    routeRoleId = role.roleId;

    // Create test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-3',
        supabaseAuthId: 'test-supabase-auth-id-3',
        nuid: '001234569',
        email: 'votingrecorduser3@example.com',
        firstName: 'Test3',
        lastName: 'User3',
        roleId: role.roleId,
        password: null,
      },
    });
    routeTestUserId = user.userId;

    // Create test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create test voting event
    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: routeTestMeetingId,
        name: 'Route Test Voting Event',
        voteType: 'YES_NO',
      },
    });
    routeTestVotingEventId = votingEvent.votingEventId;

    // Create test voting record
    const votingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: routeTestVotingEventId,
      userId: routeTestUserId,
      result: 'YES',
    });
    routeTestVotingRecordId = votingRecord.votingRecordId;
  });

  afterAll(async () => {
    await VotingRecordService.deleteVotingRecord(routeTestVotingRecordId);
    await VotingService.deleteVotingEvent(routeTestVotingEventId);
    await MeetingService.deleteMeeting(routeTestMeetingId);
    await UsersService.deleteUser(routeTestUserId);
    await UsersService.deleteRole(routeRoleId);
  });

  it('should fetch all voting records successfully', async () => {
    const { GET } = await import('../../app/api/voting-record/route');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

describe('GET /api/voting-record/by-voting-event/[votingEventId]', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;
  let routeTestVotingEvent2Id: string;
  let routeTestUserId: string;
  let routeTestUserId2: string;
  let routeTestVotingRecordId: string;
  let routeTestVotingRecord2Id: string;
  let routeTestRoleId: string;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    routeTestRoleId = role.roleId;
    // Create test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-4',
        supabaseAuthId: 'test-supabase-auth-id-4',
        nuid: '001234570',
        email: 'votingrecorduser4@example.com',
        firstName: 'Test4',
        lastName: 'User4',
        roleId: role.roleId,
        password: null,
      },
    });
    routeTestUserId = user.userId;

    // Create second test user (so two records can exist for the same voting event)
    const user2 = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-4b',
        supabaseAuthId: 'test-supabase-auth-id-4b',
        nuid: '001234574',
        email: 'votingrecorduser4b@example.com',
        firstName: 'Test4b',
        lastName: 'User4b',
        roleId: role.roleId,
        password: null,
      },
    });
    routeTestUserId2 = user2.userId;

    // Create test meetings
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create test voting events
    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: routeTestMeetingId,
        name: 'Route Test Voting Event 1',
        voteType: 'YES_NO',
      },
    });
    routeTestVotingEventId = votingEvent.votingEventId;

    const votingEvent2 = await prisma.votingEvent.create({
      data: {
        meetingId: routeTestMeetingId,
        name: 'Route Test Voting Event 2',
        voteType: 'APPROVAL',
      },
    });
    routeTestVotingEvent2Id = votingEvent2.votingEventId;

    // Create voting records for specific voting events
    const votingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: routeTestVotingEventId,
      userId: routeTestUserId,
      result: 'YES',
    });
    routeTestVotingRecordId = votingRecord.votingRecordId;

    const votingRecord2 = await VotingRecordService.createVotingRecord({
      votingEventId: routeTestVotingEventId,
      userId: routeTestUserId2,
      result: 'NO',
    });
    routeTestVotingRecord2Id = votingRecord2.votingRecordId;
  });

  afterAll(async () => {
    await VotingRecordService.deleteVotingRecord(routeTestVotingRecordId);
    await VotingRecordService.deleteVotingRecord(routeTestVotingRecord2Id);
    await VotingService.deleteVotingEvent(routeTestVotingEventId);
    await VotingService.deleteVotingEvent(routeTestVotingEvent2Id);
    await MeetingService.deleteMeeting(routeTestMeetingId);
    await UsersService.deleteUser(routeTestUserId2);
    await UsersService.deleteUser(routeTestUserId);
    await UsersService.deleteRole(routeTestRoleId);
  });

  it('should fetch voting records by voting event successfully', async () => {
    const { GET } =
      await import('../../app/api/voting-record/by-voting-event/[votingEventId]/route');
    const req = new Request(
      `http://localhost/api/voting-record/by-voting-event/${routeTestVotingEventId}`,
    );

    const params = Promise.resolve({ votingEventId: routeTestVotingEventId });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    data.forEach((record: any) => {
      expect(record.votingEventId).toBe(routeTestVotingEventId);
    });
  });

  it('should return empty array for non-existent voting event', async () => {
    const { GET } =
      await import('../../app/api/voting-record/by-voting-event/[votingEventId]/route');
    const req = new Request(
      'http://localhost/api/voting-record/by-voting-event/non-existent-id',
    );

    const params = Promise.resolve({ votingEventId: 'non-existent-id' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it('returns 403 for SECRET_BALLOT (no per-voter records)', async () => {
    const secretEvent = await prisma.votingEvent.create({
      data: {
        meetingId: routeTestMeetingId,
        name: 'Secret ballot route test',
        voteType: 'SECRET_BALLOT',
        options: ['Yes', 'No'],
      },
    });
    await prisma.votingRecord.create({
      data: {
        votingEventId: secretEvent.votingEventId,
        userId: routeTestUserId,
        result: 'Yes',
      },
    });

    const { GET } =
      await import('../../app/api/voting-record/by-voting-event/[votingEventId]/route');
    const req = new Request(
      `http://localhost/api/voting-record/by-voting-event/${secretEvent.votingEventId}`,
    );
    const params = Promise.resolve({
      votingEventId: secretEvent.votingEventId,
    });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBeDefined();

    await prisma.votingRecord.deleteMany({
      where: { votingEventId: secretEvent.votingEventId },
    });
    await prisma.votingEvent.delete({
      where: { votingEventId: secretEvent.votingEventId },
    });
  });
});

describe('POST /api/voting-record', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;
  let routeTestUserId: string;
  let routeTestRoleId: string;

  beforeAll(async () => {
    // Create test role
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    routeTestRoleId = role.roleId;

    // Create test user
    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-5',
        supabaseAuthId: 'test-supabase-auth-id-5',
        nuid: '001234571',
        email: 'votingrecorduser5@example.com',
        firstName: 'Test5',
        lastName: 'User5',
        roleId: role.roleId,
        password: null,
      },
    });
    routeTestUserId = user.userId;

    // Create test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create test voting event
    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: routeTestMeetingId,
        name: 'Route Test Voting Event',
        voteType: 'YES_NO',
      },
    });
    routeTestVotingEventId = votingEvent.votingEventId;
  });

  afterAll(async () => {
    await prisma.votingRecord.deleteMany({
      where: { votingEventId: routeTestVotingEventId },
    });

    await prisma.votingEvent.deleteMany({
      where: { votingEventId: routeTestVotingEventId },
    });

    await prisma.meeting.deleteMany({
      where: { meetingId: routeTestMeetingId },
    });

    await prisma.user.deleteMany({
      where: { userId: routeTestUserId },
    });

    await prisma.role.deleteMany({
      where: { roleId: routeTestRoleId },
    });
  });

  it('should create a new voting record successfully', async () => {
    const { POST } = await import('../../app/api/voting-record/route');
    const requestBody = {
      votingEventId: routeTestVotingEventId,
      userId: routeTestUserId,
      result: 'YES',
      updatedBy: 'test-user',
    };

    const req = new Request('http://localhost/api/voting-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toBeDefined();
    expect(data.result).toBe('YES');
    expect(data.votingEventId).toBe(routeTestVotingEventId);
    expect(data.userId).toBe(routeTestUserId);
    expect(data.votingRecordId).toBeDefined();
    expect(data.updatedBy).toBe('test-user');
  });

  it('should return 400 when required fields are missing', async () => {
    const { POST } = await import('../../app/api/voting-record/route');
    const requestBody = {
      result: 'YES',
      // Missing votingEventId and userId
    };

    const req = new Request('http://localhost/api/voting-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 409 when user has already voted for the event', async () => {
    const { POST } = await import('../../app/api/voting-record/route');
    // routeTestUserId already voted in the previous test
    const requestBody = {
      votingEventId: routeTestVotingEventId,
      userId: routeTestUserId,
      result: 'NO',
    };

    const req = new Request('http://localhost/api/voting-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already voted');
  });
});

describe('PATCH /api/voting-record/[votingRecordId]', () => {
  let patchMeetingId: string;
  let patchEventId: string;
  let patchUserId: string;
  let patchRecordId: string;
  let patchRoleId: string;

  beforeAll(async () => {
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    patchRoleId = role.roleId;

    const user = await prisma.user.create({
      data: {
        userId: 'test-voting-record-user-patch-route',
        supabaseAuthId: 'test-supabase-auth-id-patch-route',
        nuid: '001234599',
        email: 'votingrecordpatchroute@example.com',
        firstName: 'Patch',
        lastName: 'Route',
        roleId: role.roleId,
        password: null,
      },
    });
    patchUserId = user.userId;

    const meeting = await prisma.meeting.create({
      data: {
        name: 'PATCH Route Meeting',
        date: '2025-08-04',
        startTime: '10:00',
        endTime: '11:00',
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    patchMeetingId = meeting.meetingId;

    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: patchMeetingId,
        name: 'PATCH Route Voting Event',
        voteType: 'YES_NO',
      },
    });
    patchEventId = votingEvent.votingEventId;

    const votingRecord = await VotingRecordService.createVotingRecord({
      votingEventId: patchEventId,
      userId: patchUserId,
      result: 'YES',
    });
    patchRecordId = votingRecord.votingRecordId;
  });

  afterAll(async () => {
    await VotingRecordService.deleteVotingRecord(patchRecordId);
    await VotingService.deleteVotingEvent(patchEventId);
    await MeetingService.deleteMeeting(patchMeetingId);
    await UsersService.deleteUser(patchUserId);
    await UsersService.deleteRole(patchRoleId);
  });

  it('should update a voting record', async () => {
    const req = new Request(
      `http://localhost/api/voting-record/${patchRecordId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: 'ABSTAIN',
          updatedBy: 'route-patch-tester',
        }),
      },
    );
    const response = await VotingRecordController.updateVotingRecord(req, {
      votingRecordId: patchRecordId,
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result).toBe('ABSTAIN');
    expect(data.updatedBy).toBe('route-patch-tester');

    const restoreReq = new Request(
      `http://localhost/api/voting-record/${patchRecordId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result: 'YES' }),
      },
    );
    const restoreRes = await VotingRecordController.updateVotingRecord(
      restoreReq,
      { votingRecordId: patchRecordId },
    );
    expect(restoreRes.status).toBe(200);
  });
});
