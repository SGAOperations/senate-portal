import { UsersController } from '@/server/modules/users/users.controller';

export async function PUT(request: Request) {
  return UsersController.updateAttendence(request);
}
