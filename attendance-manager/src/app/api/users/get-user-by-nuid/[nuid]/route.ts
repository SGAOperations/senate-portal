import { UsersController } from '@/server/modules/users/users.controller';
import { requireCapability } from '@/server/auth/api-auth';

// Full profile lookups are for whoever takes attendance (check-in by NUID).

export async function GET(
  request: Request,
  { params }: { params: Promise<{ nuid: string }> },
) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  const { nuid } = await params;
  return UsersController.getUserByNUID({ nuid: nuid });
}
