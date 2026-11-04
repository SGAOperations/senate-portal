import { VotingController } from '@/server/modules/voting/voting.controller';

export async function GET() {
  return VotingController.getActiveVotingEvents();
}
