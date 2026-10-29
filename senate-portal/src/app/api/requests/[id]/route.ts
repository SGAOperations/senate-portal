import { NextResponse } from 'next/server';
import { RequestController } from '@/request/request.controller';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const request = await RequestController.getRequest(id);
    return NextResponse.json(request);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch request' },
      { status: 400 },
    );
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update request' },
      { status: 400 },
    );
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete request' },
      { status: 400 },
    );
  }
}
