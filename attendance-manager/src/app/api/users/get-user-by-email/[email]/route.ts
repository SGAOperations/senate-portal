import { UsersController } from '@/users/users.controller';
import { requireCapability } from '@/utils/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const { error } = await requireCapability('superadmin');
  if (error) return error;
  const { email } = await params;
  return UsersController.getUserByEmail({ email: email });
}
