import { UsersController } from '@/users/users.controller';
import { can, requireAuth } from '@/utils/api-auth';

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  return UsersController.updateAttendence(request, {
    userId: auth.actor.user?.userId ?? null,
    canManage: can(auth.actor, 'manageAttendance'),
  });
}
