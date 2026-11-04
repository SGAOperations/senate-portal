import { UsersController } from '@/users/users.controller';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const { email } = await params;
  return UsersController.getUserByEmail({ email: email });
}
