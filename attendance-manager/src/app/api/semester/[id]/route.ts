import { requireCapability } from '@/server/auth/api-auth';
import { SemesterController } from '@/server/modules/semester/semester.controller';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCapability('manageSemesters');
  if (error) return error;
  const { id } = await params;
  return SemesterController.updateSemesterDates(request, { semesterId: id });
}
