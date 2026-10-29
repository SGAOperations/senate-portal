import { VotingController } from '@/voting/voting.controller';

export async function GET() {
  return VotingController.getActiveVotingEvents();
}
