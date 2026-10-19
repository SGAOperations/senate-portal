import { NextResponse } from 'next/server';
import { SemesterService } from '@/semester/semester.service';

export async function GET() {
  try {
    const semester = await SemesterService.getCurrentSemester();
    return NextResponse.json(semester);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch current semester' },
      { status: 500 },
    );
  }
}
