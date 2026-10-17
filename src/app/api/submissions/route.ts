import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeApprovalChain, waiverBandSettingsFromRows, WAIVER_SETTING_KEYS } from '@/config/waiverRouting';
import { computeMergApprovalChain } from '@/config/mergRouting';
import { CARE_GROUP_FM_EMAIL } from '@/config/careGroups';
import { SubmissionStatus, ApprovalStepStatus, Role } from '@/types/enums';

// Routing values come only from the database. If a required setting is
// missing we refuse the submission rather than route on a hardcoded fallback.
class MissingSettingError extends Error {}

async function getRequiredThreshold(key: string): Promise<number> {
  const row = await prisma.threshold.findUnique({ where: { key } });
  if (!row) throw new MissingSettingError(key);
  return row.value;
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
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
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

    // Compute the approval chain BEFORE creating anything, so a missing setting
    // cannot leave a half-created submission behind.
    let chain: string[] = [];
    if (!isDraft) {
      if (formTypeKey === 'merg_equipment') {
        const businessCaseThreshold = await getRequiredThreshold('merg_business_case_ex_vat');
        const totalCostExVat = parsedFields.totalEstimatedCost ?? 0;
        chain = computeMergApprovalChain(totalCostExVat, businessCaseThreshold);
      } else {
        // All three waiver band boundaries come from the database.
        const rows = await prisma.threshold.findMany({
          where: { key: { in: Object.values(WAIVER_SETTING_KEYS) } },
        });
        const settings = waiverBandSettingsFromRows(rows);
        if (!settings) throw new MissingSettingError('waiver band settings');
        chain = computeApprovalChain(totalValueIncVat ?? 0, settings);
      }
    }

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
    if (error instanceof MissingSettingError) {
      console.error('Create submission: missing routing setting', error.message);
      return NextResponse.json(
        { error: `Routing setting missing from the database (${error.message}). Apply the latest migration — see README.` },
        { status: 500 }
      );
    }
    console.error('Create submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
