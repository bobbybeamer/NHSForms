import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStepStatus, SubmissionStatus } from '@/types/enums';

// Requester responds to "request more information" and resubmits.
// The SAME step (same sequence, same snapshotted assignedToId / approverRole)
// goes back to ACTIVE — the chain does not restart and earlier approvals stand.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const { id: submissionId } = await params;
  const body = await request.json();
  const response = typeof body.response === 'string' ? body.response.trim() : '';

  if (!response) {
    return NextResponse.json({ error: 'A response is required before resubmitting.' }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      approvalSteps: {
        orderBy: { sequence: 'asc' },
        include: { assignedTo: { select: { name: true } } },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Enforce: only the requester can respond and resubmit.
  if (submission.requesterId !== userId) {
    return NextResponse.json(
      { error: 'Only the requester can respond to a request for more information.' },
      { status: 403 }
    );
  }

  const step = submission.approvalSteps.find((s) => s.status === ApprovalStepStatus.INFO_REQUESTED);
  if (submission.status !== SubmissionStatus.INFO_REQUESTED || !step) {
    return NextResponse.json(
      { error: 'This submission is not waiting for more information.' },
      { status: 409 }
    );
  }

  const approverLabel = step.assignedTo
    ? `${step.assignedTo.name} (${step.approverRole})`
    : step.approverRole;

  const reactivated = await prisma.$transaction(async (tx) => {
    // Guarded on status so a double submit cannot reactivate twice.
    const { count } = await tx.approvalStep.updateMany({
      where: { id: step.id, status: ApprovalStepStatus.INFO_REQUESTED },
      data: {
        status: ApprovalStepStatus.ACTIVE,
        decisionNote: null,
        decidedById: null,
        decidedAt: null,
      },
    });
    if (count === 0) return false;

    await tx.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.IN_APPROVAL },
    });

    await tx.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'RESUBMITTED',
        detail: `${user.name} responded to the request for more information and resubmitted. Response: ${response}`,
      },
    });

    await tx.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'STEP_REACTIVATED',
        detail: `Step ${step.sequence} re-activated for ${approverLabel}. Earlier approvals stand; the chain was not restarted.`,
      },
    });

    return true;
  });

  if (!reactivated) {
    return NextResponse.json(
      { error: 'This submission is not waiting for more information.' },
      { status: 409 }
    );
  }

  const updatedSubmission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      requester: { select: { id: true, name: true, email: true, role: true, trust: true } },
      approvalSteps: {
        orderBy: { sequence: 'asc' },
        include: {
          decidedBy:  { select: { id: true, name: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
      auditEvents: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // id breaks same-millisecond ties (cuids increase)
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(updatedSubmission);
}
