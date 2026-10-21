import {
  VotingService,
  computeVotePassedFromCounts,
  deriveSecretBallotOutcome,
} from '../voting.service';
import { VotingController } from '../voting.controller';
import { prisma } from '../../lib/prisma';
import { MeetingService } from '@/meeting/meeting.service';
import { VoteType } from '@/utils/consts';
import * as apiAuth from '@/utils/api-auth';
import {
  parseMeetingDate,
  parseMeetingDateTime,
} from '@/meeting/meetingDateTime';

jest.setTimeout(20000);

describe('computeVotePassedFromCounts', () => {
  it('Yes beats No using display labels; YES/NO uppercase supported', () => {
    expect(
      computeVotePassedFromCounts({ Yes: 2, No: 1 }, [
        'Yes',
        'No',
        'Abstain',
        'No Confidence',
      ]),
    ).toBe(true);
    expect(computeVotePassedFromCounts({ YES: 1, NO: 2 }, [])).toBe(false);
  });
});

describe('deriveSecretBallotOutcome', () => {
  it('uses Passed/Failed semantics for Yes/No motion tallies', () => {
    const o = deriveSecretBallotOutcome({ Yes: 2, No: 1 }, [
      'Yes',
      'No',
      'Abstain',
    ]);
    expect(o.outcomeKind).toBe('motion_pass_fail');
    expect(o.votePassed).toBe(true);
    expect(o.winningResult).toBeNull();
  });

  it('uses option winner when tallies use arbitrary option strings (not Yes/No)', () => {
    const o = deriveSecretBallotOutcome({ 'Candidate 2': 1 }, [
      'Candidate 1',
      'Candidate 2',
    ]);
    expect(o.outcomeKind).toBe('option_winner');
    expect(o.winningResult).toBe('Candidate 2');
    expect(o.votePassed).toBe(false);
  });

  it('reports tie when top options are tied', () => {
    const o = deriveSecretBallotOutcome({ Yes: 1, No: 1 }, []);
    expect(o.outcomeKind).toBe('tie');
    expect(o.winningResult).toBeNull();
  });

  it('returns null kind when there are no votes', () => {
    const o = deriveSecretBallotOutcome({}, ['A', 'B']);
    expect(o.outcomeKind).toBeNull();
    expect(o.winningResult).toBeNull();
    expect(o.votePassed).toBeNull();
  });
});

describe('VotingService', () => {
  let testMeetingId: string;
  let testMeeting2Id: string;
  let testVotingEventId: string;
  beforeAll(async () => {
    // Create test meetings
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    const meeting2 = await prisma.meeting.create({
      data: {
        name: 'Test Meeting 2',
        date: parseMeetingDate('2025-10-04'),
        startTime: parseMeetingDateTime('2025-10-04', '09:00'),
        endTime: parseMeetingDateTime('2025-10-04', '10:00'),
        notes: 'Test notes 2',
        type: 'FULL_BODY',
      },
    });
    testMeeting2Id = meeting2.meetingId;

    // Create a test voting event for tests that need it
    const votingEvent = await VotingService.createVotingEvent({
      meetingId: testMeetingId,
      name: 'Test Voting Event',
      voteType: 'YES_NO',
      updatedBy: 'test-user',
    });
    testVotingEventId = votingEvent.votingEventId;
  });

  afterAll(async () => {
    await prisma.votingEvent.deleteMany({
      where: {
        meetingId: {
          in: [testMeetingId, testMeeting2Id],
        },
      },
    });
    await MeetingService.deleteMeeting(testMeetingId);
    await MeetingService.deleteMeeting(testMeeting2Id);
  });

  it('should create a new voting event', async () => {
    const newVotingEvent = await VotingService.createVotingEvent({
      meetingId: testMeetingId,
      name: 'New Test Voting Event',
      voteType: 'APPROVAL',
      updatedBy: 'test-user-2',
    });

    expect(newVotingEvent).toBeDefined();
    expect(newVotingEvent.name).toBe('New Test Voting Event');
    expect(newVotingEvent.votingEventId).toBeDefined();
    expect(newVotingEvent.meetingId).toBe(testMeetingId);
    expect(newVotingEvent.voteType).toBe('APPROVAL');
    expect(newVotingEvent.updatedBy).toBe('test-user-2');
    expect(newVotingEvent.createdAt).toBeDefined();
    expect(newVotingEvent.updatedAt).toBeDefined();
  });

  it('should fetch all voting events', async () => {
    const votingEvents = await VotingService.getAllVotingEvents({
      isEboard: true,
    });
    expect(Array.isArray(votingEvents)).toBe(true);
    expect(votingEvents.length).toBeGreaterThan(0);
  });

  it('should fetch a voting event by id', async () => {
    const fetchedVotingEvent =
      await VotingService.getVotingEventById(testVotingEventId);
    expect(fetchedVotingEvent?.votingEventId).toBe(testVotingEventId);
    expect(fetchedVotingEvent?.name).toBe('Test Voting Event');
  });

  it('should fetch voting events by vote type', async () => {
    // Create another voting event with same voteType
    await VotingService.createVotingEvent({
      meetingId: testMeeting2Id,
      name: 'Another YES_NO Event',
      voteType: 'YES_NO',
    });

    const votingEvents =
      await VotingService.getVotingEventsByVoteType('YES_NO');
    expect(Array.isArray(votingEvents)).toBe(true);
    expect(votingEvents.length).toBeGreaterThanOrEqual(2);
    votingEvents.forEach((event) => {
      expect(event.voteType).toBe('YES_NO');
    });
  });

  it('should update a voting event', async () => {
    const updatedVotingEvent = await VotingService.updateVotingEvent(
      testVotingEventId,
      {
        name: 'Updated Voting Event Name',
        voteType: 'APPROVAL',
      },
    );

    expect(updatedVotingEvent.name).toBe('Updated Voting Event Name');
    expect(updatedVotingEvent.voteType).toBe('APPROVAL');
    expect(updatedVotingEvent.votingEventId).toBe(testVotingEventId);
    expect(updatedVotingEvent.updatedAt).toBeDefined(); // Should be set after update
  });

  it('should include meeting and votingRecords in responses', async () => {
    const votingEvent =
      await VotingService.getVotingEventById(testVotingEventId);
    expect(votingEvent?.meeting).toBeDefined();
    expect(votingEvent?.meeting.meetingId).toBe(testMeetingId);
    expect(votingEvent?.votingRecords).toBeDefined();
    expect(Array.isArray(votingEvent?.votingRecords)).toBe(true);
  });
});

describe('VotingController', () => {
  let testMeetingId: string;
  let testMeeting2Id: string;
  let _testVotingEventId: string;
  let requireAuthSpy: jest.SpyInstance;

  beforeAll(async () => {
    requireAuthSpy = jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: { role: { roleType: 'EBOARD' } } as any,
      error: null,
    });
    // Create test meetings
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Controller Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    const meeting2 = await prisma.meeting.create({
      data: {
        name: 'Controller Test Meeting 2',
        date: parseMeetingDate('2025-10-04'),
        startTime: parseMeetingDateTime('2025-10-04', '09:00'),
        endTime: parseMeetingDateTime('2025-10-04', '10:00'),
        notes: 'Test notes 2',
        type: 'FULL_BODY',
      },
    });
    testMeeting2Id = meeting2.meetingId;
  });

  afterAll(async () => {
    requireAuthSpy.mockRestore();
    await prisma.votingEvent.deleteMany({
      where: {
        meetingId: {
          in: [testMeetingId, testMeeting2Id],
        },
      },
    });
    await MeetingService.deleteMeeting(testMeetingId);
    await MeetingService.deleteMeeting(testMeeting2Id);
  });

  describe('GET ALL', () => {
    it('should return all voting events', async () => {
      // Create a test voting event
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'GET ALL Test Event',
        voteType: 'YES_NO',
      });

      const response = await VotingController.getAllVotingEvents();
      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThan(0);
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });
  });

  describe('GET SINGULAR', () => {
    it('should return a single voting event by id', async () => {
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'GET SINGULAR Test Event',
        voteType: 'APPROVAL',
      });

      const response = await VotingController.getVotingEvent({
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(responseData.votingEventId).toBe(testVotingEvent.votingEventId);
      expect(responseData.name).toBe('GET SINGULAR Test Event');
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });

    it('should return 404 for non-existent voting event', async () => {
      const response = await VotingController.getVotingEvent({
        votingEventId: 'non-existent-id-12345',
      });

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Voting event not found');
    });
  });

  describe('GET by VoteType', () => {
    it('should return voting events filtered by vote type', async () => {
      // Create voting events with different vote types
      const votingEvent1 = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'Type Test Event 1',
        voteType: 'MULTIPLE_CHOICE',
      });

      const votingEvent2 = await VotingService.createVotingEvent({
        meetingId: testMeeting2Id,
        name: 'Type Test Event 2',
        voteType: 'MULTIPLE_CHOICE',
      });

      const response = await VotingController.getVotingEventsByVoteType({
        voteType: 'MULTIPLE_CHOICE',
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      responseData.forEach((event: any) => {
        expect(event.voteType).toBe('MULTIPLE_CHOICE');
      });
      await VotingService.deleteVotingEvent(votingEvent1.votingEventId);
      await VotingService.deleteVotingEvent(votingEvent2.votingEventId);
    });

    it('should return empty array for non-existent vote type', async () => {
      const response = await VotingController.getVotingEventsByVoteType({
        voteType: 'NON_EXISTENT_TYPE',
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(0);
    });
  });

  describe('POST', () => {
    it('should create a new voting event via controller', async () => {
      const createData = {
        meetingId: testMeetingId,
        name: 'POST Test Event',
        voteType: 'YES_NO',
        updatedBy: 'test-user',
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response = await VotingController.createVotingEvent(mockRequest);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.name).toBe('POST Test Event');
      expect(responseData.voteType).toBe('YES_NO');
      expect(responseData.meetingId).toBe(testMeetingId);
      expect(responseData.votingEventId).toBeDefined();

      _testVotingEventId = responseData.votingEventId;
      await VotingService.deleteVotingEvent(responseData.votingEventId);
    });

    it('should reject missing required fields', async () => {
      const createData = {
        name: 'Incomplete Event',
        // Missing meetingId and voteType
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response = await VotingController.createVotingEvent(mockRequest);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Missing required fields');
    });

    it('should reject invalid field types', async () => {
      const createData = {
        meetingId: 123, // Should be string
        name: 'Invalid Types Event',
        voteType: 'YES_NO',
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response = await VotingController.createVotingEvent(mockRequest);

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('Invalid field types');
    });

    it('should handle optional updatedBy field', async () => {
      const createData = {
        meetingId: testMeetingId,
        name: 'Optional UpdatedBy Event',
        voteType: 'APPROVAL',
        // updatedBy is optional
      };

      const mockRequest = {
        json: async () => createData,
      } as Request;

      const response = await VotingController.createVotingEvent(mockRequest);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.updatedBy).toBeNull();
      await VotingService.deleteVotingEvent(responseData.votingEventId);
    });
  });

  describe('PUT', () => {
    it('should update a voting event via controller', async () => {
      // Create a test voting event
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'PUT Test Event',
        voteType: 'YES_NO',
      });

      const updateData = {
        name: 'Updated PUT Test Event',
        voteType: 'APPROVAL',
        updatedBy: 'test-updater',
      };

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(responseData.name).toBe('Updated PUT Test Event');
      expect(responseData.voteType).toBe('APPROVAL');
      expect(responseData.updatedBy).toBe('test-updater');
      expect(responseData.updatedAt).toBeDefined(); // Should be set after update
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });

    it('should allow partial updates', async () => {
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'Partial Update Test',
        voteType: 'YES_NO',
      });

      // Update only the name
      const updateData = {
        name: 'Partially Updated Name',
      };

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(responseData.name).toBe('Partially Updated Name');
      // Other fields should remain unchanged
      expect(responseData.voteType).toBe('YES_NO');
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });

    it('should return 404 for non-existent voting event', async () => {
      const updateData = {
        name: 'Non-existent Event',
      };

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: 'non-existent-id-12345',
      });

      expect(response.status).toBe(404);
      const responseData = await response.json();
      expect(responseData.error).toBe('Voting event not found');
    });

    it('should reject empty update body', async () => {
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'Empty Body Test',
        voteType: 'YES_NO',
      });

      const updateData = {};

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('No valid fields to update');
    });

    it('should reject invalid field types in update', async () => {
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'Invalid Types Update Test',
        voteType: 'YES_NO',
      });

      const updateData = {
        name: 123, // Should be string
        voteType: 'APPROVAL',
      };

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response.status).toBe(400);
      const responseData = await response.json();
      expect(responseData.error).toContain('must be a string');
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });

    it('should handle soft delete via deletedAt', async () => {
      const testVotingEvent = await VotingService.createVotingEvent({
        meetingId: testMeetingId,
        name: 'Soft Delete Test',
        voteType: 'YES_NO',
      });

      const updateData = {
        deletedAt: new Date(),
      };

      const mockRequest = {
        json: async () => updateData,
      } as Request;

      const response = await VotingController.updateVotingEvent(mockRequest, {
        votingEventId: testVotingEvent.votingEventId,
      });

      expect(response).toBeDefined();
      const responseData = await response.json();
      expect(responseData.deletedAt).toBeDefined();
      await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
    });
  });
});

describe('GET /api/voting-event', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;
  let requireAuthSpy: jest.SpyInstance;

  beforeAll(async () => {
    requireAuthSpy = jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: { role: { roleType: 'EBOARD' } } as any,
      error: null,
    });
    // Create a test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create a test voting event
    const votingEvent = await VotingService.createVotingEvent({
      meetingId: routeTestMeetingId,
      name: 'Route Test Event',
      voteType: 'YES_NO',
    });
    routeTestVotingEventId = votingEvent.votingEventId;
  });

  afterAll(async () => {
    requireAuthSpy.mockRestore();
    await VotingService.deleteVotingEvent(routeTestVotingEventId);
    await MeetingService.deleteMeeting(routeTestMeetingId);
  });

  it('should fetch all voting events successfully', async () => {
    const { GET } = await import('../../app/api/voting-event/route');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(
      data.some((event: any) => event.votingEventId === routeTestVotingEventId),
    ).toBe(true);
  });
});

describe('GET /api/voting-event/[id]', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;

  beforeAll(async () => {
    // Create a test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create a test voting event
    const votingEvent = await VotingService.createVotingEvent({
      meetingId: routeTestMeetingId,
      name: 'Route Test Event',
      voteType: 'YES_NO',
    });
    routeTestVotingEventId = votingEvent.votingEventId;
  });

  afterAll(async () => {
    await VotingService.deleteVotingEvent(routeTestVotingEventId);
    await MeetingService.deleteMeeting(routeTestMeetingId);
  });

  it('should fetch voting event by id successfully', async () => {
    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      `http://localhost/api/voting-event/${routeTestVotingEventId}`,
    );

    const params = Promise.resolve({ id: routeTestVotingEventId });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.votingEventId).toBe(routeTestVotingEventId);
    expect(data.name).toBe('Route Test Event');
    expect(data.voteType).toBe('YES_NO');
    expect(data.meeting).toBeDefined();
    expect(data.meeting.meetingId).toBe(routeTestMeetingId);
  });

  it('should return 404 when voting event is not found', async () => {
    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      'http://localhost/api/voting-event/non-existent-id',
    );

    const params = Promise.resolve({ id: 'non-existent-id' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Voting event not found');
  });
});

describe('Per-voter voting results include voter names (non-secret ballot)', () => {
  let testMeetingId: string;
  let testRoleId: string;
  let user1Id: string;
  let user2Id: string;
  let votingEventId: string;

  beforeAll(async () => {
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    const user1 = await prisma.user.create({
      data: {
        userId: 'test-roll-call-user-1',
        supabaseAuthId: 'test-roll-call-supabase-auth-1',
        nuid: '009900001',
        email: 'rollcall1@example.com',
        firstName: 'Roll',
        lastName: 'CallOne',
        roleId: testRoleId,
        password: null,
      },
    });
    user1Id = user1.userId;

    const user2 = await prisma.user.create({
      data: {
        userId: 'test-roll-call-user-2',
        supabaseAuthId: 'test-roll-call-supabase-auth-2',
        nuid: '009900002',
        email: 'rollcall2@example.com',
        firstName: 'Roll',
        lastName: 'CallTwo',
        roleId: testRoleId,
        password: null,
      },
    });
    user2Id = user2.userId;

    const meeting = await prisma.meeting.create({
      data: {
        name: 'Roll Call Results Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    const votingEvent = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Roll Call Vote',
        voteType: 'ROLL_CALL',
        deletedAt: new Date(),
      },
    });
    votingEventId = votingEvent.votingEventId;

    await prisma.votingRecord.createMany({
      data: [
        {
          votingEventId,
          userId: user1Id,
          result: 'YES',
        },
        {
          votingEventId,
          userId: user2Id,
          result: 'NO',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.votingRecord.deleteMany({ where: { votingEventId } });
    await prisma.votingEvent.deleteMany({ where: { votingEventId } });
    await prisma.meeting.deleteMany({ where: { meetingId: testMeetingId } });
    await prisma.user.deleteMany({
      where: { userId: { in: [user1Id, user2Id] } },
    });
    await prisma.role.deleteMany({ where: { roleId: testRoleId } });
  });

  // concluded ROLL_CALL returns each voter's name and result
  it('returns votingRecords with user first/last names', async () => {
    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      `http://localhost/api/voting-event/${votingEventId}`,
    );
    const params = Promise.resolve({ id: votingEventId });

    const response = await GET(req, { params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.voteType).toBe('ROLL_CALL');
    expect(Array.isArray(data.votingRecords)).toBe(true);

    const record1 = data.votingRecords.find((r: any) => r.userId === user1Id);
    const record2 = data.votingRecords.find((r: any) => r.userId === user2Id);

    expect(record1).toBeDefined();
    expect(record1.result).toBe('YES');
    expect(record1.user).toBeDefined();
    expect(record1.user.firstName).toBe('Roll');
    expect(record1.user.lastName).toBe('CallOne');

    expect(record2).toBeDefined();
    expect(record2.result).toBe('NO');
    expect(record2.user).toBeDefined();
    expect(record2.user.firstName).toBe('Roll');
    expect(record2.user.lastName).toBe('CallTwo');
  });

  // same enrichment as GET [id], but via getAllVotingEvents()
  it('getAllVotingEvents returns votingRecords with user first/last names for ROLL_CALL', async () => {
    const events = await VotingService.getAllVotingEvents({ isEboard: true });
    const data = events.find(
      (e) => e != null && e.votingEventId === votingEventId,
    );
    expect(data).toBeDefined();
    expect(data!.voteType).toBe('ROLL_CALL');
    expect(Array.isArray(data!.votingRecords)).toBe(true);

    const record1 = data!.votingRecords.find(
      (r: any) => r.userId === user1Id,
    ) as any;
    const record2 = data!.votingRecords.find(
      (r: any) => r.userId === user2Id,
    ) as any;

    expect(record1).toBeDefined();
    expect(record1.result).toBe('YES');
    expect(record1.user).toBeDefined();
    expect(record1.user.firstName).toBe('Roll');
    expect(record1.user.lastName).toBe('CallOne');

    expect(record2).toBeDefined();
    expect(record2.result).toBe('NO');
    expect(record2.user).toBeDefined();
    expect(record2.user.firstName).toBe('Roll');
    expect(record2.user.lastName).toBe('CallTwo');
  });

  // YES_NO and other non-secret types get voter names (e.g. admin edit modal, results UI)
  it('returns votingRecords with user first/last names for YES_NO events', async () => {
    const nonRollCallEvent = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Non Roll Call Vote',
        voteType: 'YES_NO',
        deletedAt: new Date(),
      },
    });

    await prisma.votingRecord.create({
      data: {
        votingEventId: nonRollCallEvent.votingEventId,
        userId: user1Id,
        result: 'YES',
      },
    });

    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      `http://localhost/api/voting-event/${nonRollCallEvent.votingEventId}`,
    );
    const params = Promise.resolve({ id: nonRollCallEvent.votingEventId });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.voteType).toBe('YES_NO');
    expect(Array.isArray(data.votingRecords)).toBe(true);
    expect(data.votingRecords[0].user).toBeDefined();
    expect(data.votingRecords[0].user.firstName).toBe('Roll');
    expect(data.votingRecords[0].user.lastName).toBe('CallOne');

    await prisma.votingRecord.deleteMany({
      where: { votingEventId: nonRollCallEvent.votingEventId },
    });
    await prisma.votingEvent.delete({
      where: { votingEventId: nonRollCallEvent.votingEventId },
    });
  });

  // missing user row should not break response (user is null)
  it('returns user as null when a roll call voter user record is missing', async () => {
    const missingUserEvent = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Roll Call Missing User Vote',
        voteType: 'ROLL_CALL',
        deletedAt: new Date(),
      },
    });

    await prisma.votingRecord.create({
      data: {
        votingEventId: missingUserEvent.votingEventId,
        userId: 'missing-roll-call-user',
        result: 'ABSTAIN',
      },
    });

    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      `http://localhost/api/voting-event/${missingUserEvent.votingEventId}`,
    );
    const params = Promise.resolve({ id: missingUserEvent.votingEventId });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.voteType).toBe('ROLL_CALL');
    expect(Array.isArray(data.votingRecords)).toBe(true);
    expect(data.votingRecords[0].result).toBe('ABSTAIN');
    expect(data.votingRecords[0].user).toBeNull();

    await prisma.votingRecord.deleteMany({
      where: { votingEventId: missingUserEvent.votingEventId },
    });
    await prisma.votingEvent.delete({
      where: { votingEventId: missingUserEvent.votingEventId },
    });
  });
});

describe('Secret ballot results (aggregates only)', () => {
  let testMeetingId: string;
  let secretVotingEventId: string;
  let testRoleId: string;
  let user1Id: string;
  let user2Id: string;
  let user3Id: string;

  beforeAll(async () => {
    const role = await prisma.role.create({
      data: { roleType: 'MEMBER' },
    });
    testRoleId = role.roleId;

    const u1 = await prisma.user.create({
      data: {
        userId: 'test-secret-ballot-user-1',
        supabaseAuthId: 'test-secret-supabase-1',
        nuid: '009901001',
        email: 'secret1@example.com',
        firstName: 'Secret',
        lastName: 'VoterOne',
        roleId: testRoleId,
        password: null,
      },
    });
    user1Id = u1.userId;

    const u2 = await prisma.user.create({
      data: {
        userId: 'test-secret-ballot-user-2',
        supabaseAuthId: 'test-secret-supabase-2',
        nuid: '009901002',
        email: 'secret2@example.com',
        firstName: 'Secret',
        lastName: 'VoterTwo',
        roleId: testRoleId,
        password: null,
      },
    });
    user2Id = u2.userId;

    const u3 = await prisma.user.create({
      data: {
        userId: 'test-secret-ballot-user-3',
        supabaseAuthId: 'test-secret-supabase-3',
        nuid: '009901003',
        email: 'secret3@example.com',
        firstName: 'Secret',
        lastName: 'VoterThree',
        roleId: testRoleId,
        password: null,
      },
    });
    user3Id = u3.userId;

    const meeting = await prisma.meeting.create({
      data: {
        name: 'Secret Ballot Meeting',
        date: parseMeetingDate('2025-09-01'),
        startTime: parseMeetingDateTime('2025-09-01', '10:00'),
        endTime: parseMeetingDateTime('2025-09-01', '11:00'),
        notes: 'Test',
        type: 'REGULAR',
      },
    });
    testMeetingId = meeting.meetingId;

    const ve = await prisma.votingEvent.create({
      data: {
        meetingId: testMeetingId,
        name: 'Budget approval (secret)',
        voteType: VoteType.secretBallot,
        notes: 'Motion notes for the secret ballot',
        options: ['Yes', 'No', 'Abstain', 'No Confidence'],
        deletedAt: new Date(),
      },
    });
    secretVotingEventId = ve.votingEventId;

    await prisma.votingRecord.createMany({
      data: [
        { votingEventId: secretVotingEventId, userId: user1Id, result: 'Yes' },
        { votingEventId: secretVotingEventId, userId: user2Id, result: 'Yes' },
        { votingEventId: secretVotingEventId, userId: user3Id, result: 'No' },
      ],
    });
  });

  afterAll(async () => {
    await prisma.votingRecord.deleteMany({
      where: { votingEventId: secretVotingEventId },
    });
    await prisma.votingEvent.deleteMany({
      where: { votingEventId: secretVotingEventId },
    });
    await prisma.meeting.deleteMany({ where: { meetingId: testMeetingId } });
    await prisma.user.deleteMany({
      where: { userId: { in: [user1Id, user2Id, user3Id] } },
    });
    await prisma.role.deleteMany({ where: { roleId: testRoleId } });
  });

  it('GET /api/voting-event/[id] returns resultCounts, votePassed, notes — no votingRecords', async () => {
    const { GET } = await import('../../app/api/voting-event/[id]/route');
    const req = new Request(
      `http://localhost/api/voting-event/${secretVotingEventId}`,
    );
    const params = Promise.resolve({ id: secretVotingEventId });
    const response = await GET(req, { params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.voteType).toBe(VoteType.secretBallot);
    expect(data.notes).toBe('Motion notes for the secret ballot');
    expect(data.resultCounts).toEqual({ Yes: 2, No: 1 });
    expect(data.votePassed).toBe(true);
    expect(data.secretBallotOutcomeKind).toBe('motion_pass_fail');
    expect(data.winningResult).toBeNull();
    expect(data).not.toHaveProperty('votingRecords');
  });

  it('getAllVotingEvents omits votingRecords for secret ballot with aggregates', async () => {
    const events = await VotingService.getAllVotingEvents({ isEboard: true });
    const row = events.find(
      (e) => e != null && e.votingEventId === secretVotingEventId,
    );
    expect(row).toBeDefined();
    expect((row as any).resultCounts).toEqual({ Yes: 2, No: 1 });
    expect((row as any).votePassed).toBe(true);
    expect((row as any).secretBallotOutcomeKind).toBe('motion_pass_fail');
    expect((row as any).winningResult).toBeNull();
    expect(row).not.toHaveProperty('votingRecords');
  });

  it('GET /api/voting-event/by-type returns aggregates only for SECRET_BALLOT', async () => {
    const { GET } =
      await import('../../app/api/voting-event/by-type/[voteType]/route');
    const req = new Request(
      `http://localhost/api/voting-event/by-type/${VoteType.secretBallot}`,
    );
    const params = Promise.resolve({
      voteType: VoteType.secretBallot,
    });
    const response = await GET(req, { params });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    const row = data.find((e: any) => e.votingEventId === secretVotingEventId);
    expect(row).toBeDefined();
    expect(row.resultCounts).toEqual({ Yes: 2, No: 1 });
    expect(row.secretBallotOutcomeKind).toBe('motion_pass_fail');
    expect(row.winningResult).toBeNull();
    expect(row).not.toHaveProperty('votingRecords');
  });
});

describe('GET /api/voting-event/by-type/[voteType]', () => {
  let routeTestMeetingId: string;
  let routeTestMeeting2Id: string;
  let routeTestVotingEvent1Id: string;
  let routeTestVotingEvent2Id: string;

  beforeAll(async () => {
    // Create test meetings
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    const meeting2 = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting 2',
        date: parseMeetingDate('2025-10-04'),
        startTime: parseMeetingDateTime('2025-10-04', '09:00'),
        endTime: parseMeetingDateTime('2025-10-04', '10:00'),
        notes: 'Test notes 2',
        type: 'FULL_BODY',
      },
    });
    routeTestMeeting2Id = meeting2.meetingId;

    // Create voting events with specific vote types
    const votingEvent1 = await VotingService.createVotingEvent({
      meetingId: routeTestMeetingId,
      name: 'Route Type Test Event 1',
      voteType: 'APPROVAL',
    });
    routeTestVotingEvent1Id = votingEvent1.votingEventId;

    const votingEvent2 = await VotingService.createVotingEvent({
      meetingId: routeTestMeeting2Id,
      name: 'Route Type Test Event 2',
      voteType: 'APPROVAL',
    });
    routeTestVotingEvent2Id = votingEvent2.votingEventId;
  });

  afterAll(async () => {
    await VotingService.deleteVotingEvent(routeTestVotingEvent1Id);
    await VotingService.deleteVotingEvent(routeTestVotingEvent2Id);
    await MeetingService.deleteMeeting(routeTestMeetingId);
    await MeetingService.deleteMeeting(routeTestMeeting2Id);
  });

  it('should fetch voting events by vote type successfully', async () => {
    const { GET } =
      await import('../../app/api/voting-event/by-type/[voteType]/route');
    const req = new Request(
      'http://localhost/api/voting-event/by-type/APPROVAL',
    );

    const params = Promise.resolve({ voteType: 'APPROVAL' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    data.forEach((event: any) => {
      expect(event.voteType).toBe('APPROVAL');
    });
  });

  it('should return empty array for non-existent vote type', async () => {
    const { GET } =
      await import('../../app/api/voting-event/by-type/[voteType]/route');
    const req = new Request(
      'http://localhost/api/voting-event/by-type/NON_EXISTENT_TYPE',
    );

    const params = Promise.resolve({ voteType: 'NON_EXISTENT_TYPE' });
    const response = await GET(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
});

describe('POST /api/voting-event', () => {
  let routeTestMeetingId: string;
  let requireAuthSpy: jest.SpyInstance;

  beforeAll(async () => {
    requireAuthSpy = jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: { role: { roleType: 'EBOARD' } } as any,
      error: null,
    });
    // Create a test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;
  });

  afterAll(async () => {
    requireAuthSpy.mockRestore();
    await MeetingService.deleteMeeting(routeTestMeetingId);
  });

  it('should create a new voting event successfully', async () => {
    const { POST } = await import('../../app/api/voting-event/route');
    const requestBody = {
      meetingId: routeTestMeetingId,
      name: 'POST Route Test Event',
      voteType: 'YES_NO',
      updatedBy: 'test-user',
    };

    const req = new Request('http://localhost/api/voting-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toBeDefined();
    expect(data.name).toBe('POST Route Test Event');
    expect(data.voteType).toBe('YES_NO');
    expect(data.meetingId).toBe(routeTestMeetingId);
    expect(data.votingEventId).toBeDefined();
    expect(data.updatedBy).toBe('test-user');
    await VotingService.deleteVotingEvent(data.votingEventId);
  });

  it('should persist notes when creating a voting event', async () => {
    const { POST } = await import('../../app/api/voting-event/route');
    const requestBody = {
      meetingId: routeTestMeetingId,
      name: 'POST Route Test Event With Notes',
      voteType: 'YES_NO',
      notes: 'Create notes test',
      updatedBy: 'test-user',
    };

    const req = new Request('http://localhost/api/voting-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.notes).toBe('Create notes test');
    await VotingService.deleteVotingEvent(data.votingEventId);
  });

  it('should auto-include No Confidence and Abstain for SECRET_BALLOT create', async () => {
    const { POST } = await import('../../app/api/voting-event/route');
    const requestBody = {
      meetingId: routeTestMeetingId,
      name: 'POST Secret Ballot Defaults',
      voteType: VoteType.secretBallot,
      options: ['Candidate 1', 'Candidate 2'],
      updatedBy: 'test-user',
    };

    const req = new Request('http://localhost/api/voting-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.options).toEqual(
      expect.arrayContaining([
        'Candidate 1',
        'Candidate 2',
        'No Confidence',
        'Abstain',
      ]),
    );
    await VotingService.deleteVotingEvent(data.votingEventId);
  });

  it('should return 400 when options contains non-string values', async () => {
    const { POST } = await import('../../app/api/voting-event/route');
    const requestBody = {
      meetingId: routeTestMeetingId,
      name: 'POST Route Invalid Options',
      voteType: VoteType.secretBallot,
      options: ['Candidate 1', 123],
      updatedBy: 'test-user',
    };

    const req = new Request('http://localhost/api/voting-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('options must be an array of strings');
  });

  it('should return 400 when required fields are missing', async () => {
    const { POST } = await import('../../app/api/voting-event/route');
    const requestBody = {
      name: 'Incomplete Event',
      // Missing meetingId and voteType
    };

    const req = new Request('http://localhost/api/voting-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });
});

describe('PUT /api/voting-event/[id]', () => {
  let routeTestMeetingId: string;
  let routeTestVotingEventId: string;
  let requireAuthSpy: jest.SpyInstance;

  beforeAll(async () => {
    requireAuthSpy = jest.spyOn(apiAuth, 'requireAuth').mockResolvedValue({
      user: { role: { roleType: 'EBOARD' } } as any,
      error: null,
    });
    // Create a test meeting
    const meeting = await prisma.meeting.create({
      data: {
        name: 'Route Test Meeting',
        date: parseMeetingDate('2025-08-04'),
        startTime: parseMeetingDateTime('2025-08-04', '10:00'),
        endTime: parseMeetingDateTime('2025-08-04', '11:00'),
        notes: 'Test notes',
        type: 'REGULAR',
      },
    });
    routeTestMeetingId = meeting.meetingId;

    // Create a test voting event
    const votingEvent = await VotingService.createVotingEvent({
      meetingId: routeTestMeetingId,
      name: 'PUT Route Test Event',
      voteType: 'YES_NO',
    });
    routeTestVotingEventId = votingEvent.votingEventId;
  });

  afterAll(async () => {
    requireAuthSpy.mockRestore();
    await VotingService.deleteVotingEvent(routeTestVotingEventId);
    await MeetingService.deleteMeeting(routeTestMeetingId);
  });

  it('should update a voting event successfully', async () => {
    const { PUT } = await import('../../app/api/voting-event/[id]/route');
    const requestBody = {
      name: 'Updated PUT Route Test Event',
      voteType: 'APPROVAL',
      updatedBy: 'test-updater',
    };

    const req = new Request(
      `http://localhost/api/voting-event/${routeTestVotingEventId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ id: routeTestVotingEventId });
    const response = await PUT(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    expect(data.name).toBe('Updated PUT Route Test Event');
    expect(data.voteType).toBe('APPROVAL');
    expect(data.updatedBy).toBe('test-updater');
    expect(data.votingEventId).toBe(routeTestVotingEventId);
    expect(data.updatedAt).toBeDefined();
  });

  it('should soft delete a voting event and update deletedAt', async () => {
    const testVotingEvent = await VotingService.createVotingEvent({
      meetingId: routeTestMeetingId,
      name: 'Soft Delete Test',
      voteType: 'YES_NO',
    });

    const { PUT } = await import('../../app/api/voting-event/[id]/route');
    const requestBody = { deletedAt: new Date().toISOString() };
    const req = new Request(
      `http://localhost/api/voting-event/${testVotingEvent.votingEventId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ id: testVotingEvent.votingEventId });
    const response = await PUT(req, { params });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data.deletedAt).toBeDefined();

    const reloaded = await VotingService.getVotingEventById(
      testVotingEvent.votingEventId,
    );
    expect(reloaded?.deletedAt).toBeDefined();

    await VotingService.deleteVotingEvent(testVotingEvent.votingEventId);
  });
  it('should allow admin to update voting event notes', async () => {
    const { PUT } = await import('../../app/api/voting-event/[id]/route');
    const requestBody = {
      notes: 'Updated notes from PUT test',
      updatedBy: 'test-updater',
    };

    const req = new Request(
      `http://localhost/api/voting-event/${routeTestVotingEventId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ id: routeTestVotingEventId });
    const response = await PUT(req, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.notes).toBe('Updated notes from PUT test');
  });

  it('should return 404 when voting event is not found', async () => {
    const { PUT } = await import('../../app/api/voting-event/[id]/route');
    const requestBody = {
      name: 'Non-existent Event',
    };

    const req = new Request(
      'http://localhost/api/voting-event/non-existent-id',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      },
    );

    const params = Promise.resolve({ id: 'non-existent-id' });
    const response = await PUT(req, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Voting event not found');
  });
});
