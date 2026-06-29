import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStepStatus } from '@/types/enums';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  // Find steps where:
  // (a) approverRole matches user's role AND assignedToId is null (standard role-based routing), OR
  // (b) assignedToId matches this user's id (care-group-specific Finance Manager routing)
  const activeSteps = await prisma.approvalStep.findMany({
    where: {
      status: ApprovalStepStatus.ACTIVE,
      OR: [
        { approverRole: user.role, assignedToId: null },
        { assignedToId: userId },
      ],
    },
    include: {
      submission: {
        include: {
          requester: { select: { id: true, name: true } },
          approvalSteps: { orderBy: { sequence: 'asc' } },
        },
      },
    },
    orderBy: { submission: { createdAt: 'asc' } },
  });

  const result = activeSteps.map((step) => ({
    step,
    submission: step.submission,
  }));

  return NextResponse.json(result);
}
