import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';
import { toErrorResponse } from '@/utils/api-errors';
import { can, forbidden, requireAuth } from '@/utils/api-auth';
import type { Capability } from '@/lib/permissions';
import { requestOwner } from '@/utils/ownership';

// Each method: the request's own member, or someone holding `capability`.
async function authorize(requestId: string, capability: Capability) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { actor } = auth;
  const owner = await requestOwner(requestId);
  if (!owner) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }
  if (owner !== actor.user?.userId && !can(actor, capability)) {
    return forbidden();
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const denied = await authorize(id, 'readRecords');
    if (denied) return denied;
    const request = await RequestController.getRequest(id);
    return NextResponse.json(request);
  } catch (error) {
    return toErrorResponse(error, 'Failed to fetch request');
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const denied = await authorize(id, 'manageAttendance');
    if (denied) return denied;
    let data: unknown;
    try {
      data = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }
    const updated = await RequestController.updateRequest(id, data);
    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error, 'Failed to update request');
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const denied = await authorize(id, 'manageAttendance');
    if (denied) return denied;
    await RequestController.deleteRequest(id);
    return NextResponse.json({ message: 'Request deleted' });
  } catch (error) {
    return toErrorResponse(error, 'Failed to delete request');
  }
}
