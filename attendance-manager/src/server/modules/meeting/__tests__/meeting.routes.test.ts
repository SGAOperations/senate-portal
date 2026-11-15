import { signInAsActor, testActor } from '@/test/helpers';
import { GET as listMeetings } from '@/app/api/meeting/route';
import { GET as getMeeting } from '@/app/api/meeting/[id]/route';
import { GET as listMeetingsByDate } from '@/app/api/meeting/by-date/route';
import { GET as listUpcomingMeetings } from '@/app/api/meeting/upcoming/route';

jest.setTimeout(20000);

// Meeting reads are for anyone signed in, and no one else.
const routes = [
  ['GET /api/meeting', () => listMeetings()],
  ['GET /api/meeting/by-date', () => listMeetingsByDate()],
  ['GET /api/meeting/upcoming', () => listUpcomingMeetings()],
  [
    'GET /api/meeting/[id]',
    () =>
      getMeeting(new Request('http://localhost/api/meeting/x'), {
        params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }),
      }),
  ],
] as const;

afterEach(() => jest.restoreAllMocks());

it.each(routes)('%s returns 401 when signed out', async (_name, call) => {
  signInAsActor(null);
  expect((await call()).status).toBe(401);
});

it.each(routes)('%s answers a signed-in member', async (_name, call) => {
  signInAsActor(testActor({ capabilities: ['roster'] }));
  expect((await call()).status).not.toBe(401);
  expect((await call()).status).not.toBe(403);
});
