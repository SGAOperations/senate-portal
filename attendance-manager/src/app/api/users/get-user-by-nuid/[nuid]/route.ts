import { UsersController } from '@/users/users.controller';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nuid: string }> },
) {
  const { nuid } = await params;
  return UsersController.getUserByNUID({ nuid: nuid });
}
