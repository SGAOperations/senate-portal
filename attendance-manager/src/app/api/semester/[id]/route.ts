import { NextResponse } from 'next/server';
import { requireAuth } from '@/utils/api-auth';
import { SemesterController } from '@/semester/semester.controller';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (user.role.roleType !== 'EBOARD') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  return SemesterController.updateSemesterDates(request, { semesterId: id });
}
