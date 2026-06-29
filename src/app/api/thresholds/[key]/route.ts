import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { key } = await params;
  const body = await request.json();
  const { value } = body;

  if (typeof value !== 'number' || isNaN(value) || value <= 0) {
    return NextResponse.json({ error: 'value must be a positive number' }, { status: 400 });
  }

  const existing = await prisma.threshold.findUnique({ where: { key } });
  if (!existing) {
    return NextResponse.json({ error: 'Threshold not found' }, { status: 404 });
  }

  const updated = await prisma.threshold.update({
    where: { key },
    data: { value },
  });

  return NextResponse.json(updated);
}
