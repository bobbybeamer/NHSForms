import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeApprovalChain } from '@/config/waiverRouting';
import { SubmissionStatus, ApprovalStepStatus } from '@/types/enums';

export async function GET(request: NextRequest) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const submissions = await prisma.submission.findMany({
    where: { requesterId: userId },
    include: {
      approvalSteps: { orderBy: { sequence: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(submissions);
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { formTypeKey, trust, fieldValues, totalValueIncVat, action } = body;

    if (!formTypeKey || !trust) {
      return NextResponse.json({ error: 'formTypeKey and trust are required' }, { status: 400 });
    }

    const isDraft = action === 'draft';
    const status: SubmissionStatus = isDraft
      ? SubmissionStatus.DRAFT
      : SubmissionStatus.IN_APPROVAL;

    const submission = await prisma.submission.create({
      data: {
        formTypeKey,
        requesterId: userId,
        trust,
        status,
        totalValueIncVat: totalValueIncVat ?? 0,
        fieldValues: typeof fieldValues === 'string' ? fieldValues : JSON.stringify(fieldValues ?? {}),
      },
    });

    if (!isDraft) {
      const chain = computeApprovalChain(totalValueIncVat ?? 0);

      for (let i = 0; i < chain.length; i++) {
        await prisma.approvalStep.create({
          data: {
            submissionId: submission.id,
            sequence: i + 1,
            approverRole: chain[i],
            status: i === 0 ? ApprovalStepStatus.ACTIVE : ApprovalStepStatus.PENDING,
          },
        });
      }

      await prisma.auditEvent.create({
        data: {
          submissionId: submission.id,
          actorId: userId,
          action: 'SUBMITTED',
          detail: `Submission created and submitted for approval. Value: £${totalValueIncVat?.toLocaleString()} inc VAT. Chain: ${chain.join(' → ')}.`,
        },
      });
    } else {
      await prisma.auditEvent.create({
        data: {
          submissionId: submission.id,
          actorId: userId,
          action: 'DRAFT_SAVED',
          detail: 'Submission saved as draft.',
        },
      });
    }

    const fullSubmission = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: { approvalSteps: { orderBy: { sequence: 'asc' } } },
    });

    return NextResponse.json(fullSubmission, { status: 201 });
  } catch (error) {
    console.error('Create submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
