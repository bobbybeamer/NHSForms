import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true, trust: true } },
      approvalSteps: {
        orderBy: { sequence: 'asc' },
        include: {
          decidedBy: { select: { id: true, name: true } },
        },
      },
      auditEvents: {
        orderBy: { createdAt: 'asc' },
        include: {
          actor: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  return NextResponse.json(submission);
}
