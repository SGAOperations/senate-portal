import { NextResponse } from 'next/server';
import { RequestController } from '@/server/modules/request/request.controller';
import { toErrorResponse } from '@/server/http/api-errors';
import {
  guardChangeRequest,
  guardReadRequest,
} from '@/server/modules/request/request.guards';

// GET: the request's owner, or manageAttendance or readRecords.
// PUT and DELETE: the owner while the request is pending, or manageAttendance.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const denied = await guardReadRequest(id);
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
    const denied = await guardChangeRequest(id);
    if (denied) return denied;
    const data = await req.json();
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
    const denied = await guardChangeRequest(id);
    if (denied) return denied;
    await RequestController.deleteRequest(id);
    return NextResponse.json({ message: 'Request deleted' });
  } catch (error) {
    return toErrorResponse(error, 'Failed to delete request');
  }
}
