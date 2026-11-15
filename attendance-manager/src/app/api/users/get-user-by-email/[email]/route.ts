import { UsersController } from '@/server/modules/users/users.controller';
import { requireCapability } from '@/server/auth/api-auth';

// Full profile lookups are for whoever takes attendance (check-in by NUID).

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  const { email } = await params;
  return UsersController.getUserByEmail({ email: email });
}
