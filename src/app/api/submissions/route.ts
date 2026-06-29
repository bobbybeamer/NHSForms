import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeApprovalChain } from '@/config/waiverRouting';
import { computeMergApprovalChain } from '@/config/mergRouting';
import { CARE_GROUP_FM_EMAIL } from '@/config/careGroups';
import { SubmissionStatus, ApprovalStepStatus, Role } from '@/types/enums';

// Fetch a threshold from the database. Falls back to the given default if the
// record is somehow missing (should not happen after seeding).
async function getThreshold(key: string, fallback: number): Promise<number> {
  const row = await prisma.threshold.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

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

    const parsedFields = typeof fieldValues === 'object' && fieldValues !== null
      ? fieldValues
      : (() => { try { return JSON.parse(fieldValues ?? '{}'); } catch { return {}; } })();

    // NOTE: For MERG submissions, totalValueIncVat stores the total estimated
    // project cost (ex VAT). MERG has no separate VAT field — confirm with client.
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
      let chain: string[];

      if (formTypeKey === 'merg_equipment') {
        // Fetch business-case threshold from DB — no hardcoded value here.
        const businessCaseThreshold = await getThreshold('merg_business_case_ex_vat', 50_000);
        const totalCostExVat = parsedFields.totalEstimatedCost ?? 0;
        chain = computeMergApprovalChain(totalCostExVat, businessCaseThreshold);
      } else {
        // Fetch PA23 threshold from DB — this drives the Waiver final-approver band.
        // Fallback only fires if the DB row is absent (should never happen post-seed).
        // The 135_018 here is a safety net, NOT a routing policy value.
        const pa23IncVat = await getThreshold('pa23_inc_vat', 135_018);
        chain = computeApprovalChain(totalValueIncVat ?? 0, pa23IncVat);
      }

      for (let i = 0; i < chain.length; i++) {
        // For MERG step 1 (FINANCE_MANAGER), look up the specific FM by care group.
        let assignedToId: string | null = null;
        if (formTypeKey === 'merg_equipment' && i === 0 && chain[0] === Role.FINANCE_MANAGER) {
          const careGroup = parseInt(parsedFields.careGroup ?? '1', 10);
          const fmEmail = CARE_GROUP_FM_EMAIL[careGroup] ?? CARE_GROUP_FM_EMAIL[1];
          const fmUser = await prisma.user.findUnique({ where: { email: fmEmail } });
          assignedToId = fmUser?.id ?? null;
        }

        await prisma.approvalStep.create({
          data: {
            submissionId: submission.id,
            sequence: i + 1,
            approverRole: chain[i],
            status: i === 0 ? ApprovalStepStatus.ACTIVE : ApprovalStepStatus.PENDING,
            ...(assignedToId ? { assignedToId } : {}),
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
