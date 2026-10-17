import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApprovalStepStatus, SubmissionStatus } from '@/types/enums';
import { approverCheckError } from '@/lib/stepAuthorisation';

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
  const { action, note, stepId } = body;

  if (!action || !stepId) {
    return NextResponse.json({ error: 'action and stepId are required' }, { status: 400 });
  }

  if (!['approve', 'reject', 'info_request'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Fetch the step and verify it belongs to this submission
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: { submission: true },
  });

  if (!step || step.submissionId !== submissionId) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 });
  }

  // Enforce: step must be ACTIVE
  if (step.status !== ApprovalStepStatus.ACTIVE) {
    return NextResponse.json(
      { error: 'This step is not currently active. You cannot act on it.' },
      { status: 403 }
    );
  }

  // Enforce: current user must be the intended approver for this step — the
  // assigned person if the step has one (e.g. care-group FM), otherwise the role.
  // Applies identically to approve, reject and info_request; no state is written
  // and no audit event is created when this check fails.
  const approverError = approverCheckError(step, user);
  if (approverError) {
    return NextResponse.json({ error: approverError }, { status: 403 });
  }

  const now = new Date();

  if (action === 'approve') {
    // Mark step APPROVED
    await prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: ApprovalStepStatus.APPROVED,
        decisionNote: note ?? null,
        decidedById: userId,
        decidedAt: now,
      },
    });

    // Find next PENDING step
    const allSteps = await prisma.approvalStep.findMany({
      where: { submissionId },
      orderBy: { sequence: 'asc' },
    });

    const nextStep = allSteps.find(
      (s) => s.sequence > step.sequence && s.status === ApprovalStepStatus.PENDING
    );

    if (nextStep) {
      // Advance to next step
      await prisma.approvalStep.update({
        where: { id: nextStep.id },
        data: { status: ApprovalStepStatus.ACTIVE },
      });

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.IN_APPROVAL },
      });

      await prisma.auditEvent.create({
        data: {
          submissionId,
          actorId: userId,
          action: 'APPROVED',
          detail: `Step ${step.sequence} approved by ${user.name} (${user.role}). Note: ${note ?? 'No note'}. Advanced to step ${nextStep.sequence} (${nextStep.approverRole}).`,
        },
      });
    } else {
      // All steps approved — mark submission APPROVED
      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.APPROVED },
      });

      await prisma.auditEvent.create({
        data: {
          submissionId,
          actorId: userId,
          action: 'APPROVED',
          detail: `Final step ${step.sequence} approved by ${user.name} (${user.role}). Note: ${note ?? 'No note'}. Submission is now APPROVED.`,
        },
      });
    }
  } else if (action === 'reject') {
    await prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: ApprovalStepStatus.REJECTED,
        decisionNote: note ?? null,
        decidedById: userId,
        decidedAt: now,
      },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.REJECTED },
    });

    await prisma.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'REJECTED',
        detail: `Step ${step.sequence} rejected by ${user.name} (${user.role}). Note: ${note ?? 'No note'}. Submission rejected.`,
      },
    });
  } else if (action === 'info_request') {
    // Step becomes INFO_REQUESTED, submission becomes INFO_REQUESTED
    // Step does NOT advance — the approver can re-act after clarification
    await prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        status: ApprovalStepStatus.INFO_REQUESTED,
        decisionNote: note ?? null,
        decidedById: userId,
        decidedAt: now,
      },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: SubmissionStatus.INFO_REQUESTED },
    });

    await prisma.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'INFO_REQUESTED',
        detail: `Step ${step.sequence}: ${user.name} (${user.role}) requested more information. Note: ${note ?? 'No note'}.`,
      },
    });
  }

  const updatedSubmission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      requester: { select: { id: true, name: true } },
      approvalSteps: {
        orderBy: { sequence: 'asc' },
        include: { decidedBy: { select: { id: true, name: true } } },
      },
      auditEvents: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json(updatedSubmission);
}
