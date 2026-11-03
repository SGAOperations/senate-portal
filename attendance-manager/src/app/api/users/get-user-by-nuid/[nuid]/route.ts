import { UsersController } from '@/users/users.controller';
import { requireCapability } from '@/utils/api-auth';

// manageAttendance only (check-in by NUID). NUIDs are student IDs.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ nuid: string }> },
) {
  const { error } = await requireCapability('manageAttendance');
  if (error) return error;
  const { nuid } = await params;
  return UsersController.getUserByNUID({ nuid: nuid });
}
