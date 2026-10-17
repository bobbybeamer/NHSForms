import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

// Recent admin changes, newest first. ADMIN only.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const events = await prisma.adminAuditEvent.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
    include: { actor: { select: { id: true, name: true } } },
  });

  return NextResponse.json(events);
}
