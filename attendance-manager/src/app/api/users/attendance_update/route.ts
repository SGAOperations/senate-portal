import { UsersController } from '@/users/users.controller';

export async function PUT(request: Request) {
  return UsersController.updateAttendence(request);
}
