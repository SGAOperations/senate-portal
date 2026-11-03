import { VotingController } from '@/voting/voting.controller';
import { requireAuth } from '@/utils/api-auth';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return VotingController.getActiveVotingEvents();
}
