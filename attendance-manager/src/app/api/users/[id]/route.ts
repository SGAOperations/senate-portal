import { UsersController } from '@/users/users.controller';
import { requireCapability, requireSelfOr } from '@/utils/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { error } = await requireSelfOr(id, 'readRecords');
  if (error) return error;
  return UsersController.getUser({ userId: id });
}

// Superadmin only: NUID and name corrections. Authority comes from SGAuth.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCapability('superadmin');
  if (error) return error;
  const { id } = await params;
  return UsersController.updateUser(request, { userId: id });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCapability('superadmin');
  if (error) return error;
  const { id } = await params;
  return UsersController.deleteUser({ userId: id });
}
