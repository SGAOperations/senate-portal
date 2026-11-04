import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';
import { toErrorResponse } from '@/utils/api-errors';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
    await RequestController.deleteRequest(id);
    return NextResponse.json({ message: 'Request deleted' });
  } catch (error) {
    return toErrorResponse(error, 'Failed to delete request');
  }
}
