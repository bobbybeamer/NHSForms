import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CARE_GROUP_FM_EMAIL, CARE_GROUP_MANAGER_EMAIL, CARE_GROUP_MANAGER_NAME } from '@/config/careGroups';
import {
  computeMergConcludedTo,
  computeMergConcludedCc,
  computeMergQuoteTo,
  computeMergQuoteCc,
  computeNotificationCc,
} from '@/config/recipients';
import {
  buildNotificationEmail,
  buildWaiverNotificationEmail,
  buildQuoteRequestEmail,
  buildConcludedPurchasingEmail,
  buildConcludedLeasingEmail,
} from '@/config/emailTemplates';

const VALID_TYPES = ['notification', 'quote_request', 'concluded_purchasing', 'concluded_leasing'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.cookies.get('nhs_user_id')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({ where: { id: userId } });
  if (!actor) {
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  const { id: submissionId } = await params;
  const body = await request.json();
  const { templateType } = body;

  if (!VALID_TYPES.includes(templateType)) {
    return NextResponse.json({ error: `Invalid templateType. Must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approvalSteps: {
        orderBy: { sequence: 'asc' },
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const fields = (() => {
    try { return JSON.parse(submission.fieldValues) as Record<string, unknown>; } catch { return {} as Record<string, unknown>; }
  })();

  const ref = submission.id.slice(-8).toUpperCase();
  const isMerg = submission.formTypeKey === 'merg_equipment';

  // Human-readable approval chain (from snapshotted steps)
  const approvalChain = submission.approvalSteps
    .map((s) => s.approverRole.replace(/_/g, ' '))
    .join(' → ');

  // ── Notification email ──────────────────────────────────────────────────────
  if (templateType === 'notification') {
    const activeStep = submission.approvalSteps.find((s) => s.status === 'ACTIVE');
    if (!activeStep) {
      return NextResponse.json(
        { error: 'No active approval step — this submission has no step currently awaiting action. A notification email cannot be generated.' },
        { status: 400 }
      );
    }

    // Approver: use assignedTo (MERG FM) if present; otherwise look up by role.
    // This enforces that the email is addressed to the CURRENT active step only —
    // it is not possible to generate an email for a PENDING later step.
    let approver: { name: string; email: string };
    if (activeStep.assignedTo) {
      approver = activeStep.assignedTo;
    } else {
      const userByRole = await prisma.user.findFirst({ where: { role: activeStep.approverRole } });
      if (!userByRole) {
        return NextResponse.json(
          { error: `No user found for role ${activeStep.approverRole} — cannot compute email address.` },
          { status: 400 }
        );
      }
      approver = { name: userByRole.name, email: userByRole.email };
    }

    const to = [approver];
    let cc: { name: string; email: string }[];

    if (isMerg) {
      cc = computeNotificationCc('merg_equipment');
    } else {
      const procBp = await prisma.user.findFirst({ where: { role: 'PROCUREMENT_BP' } });
      cc = computeNotificationCc('sfi_waiver', procBp?.email, procBp?.name);
    }

    const ctx = {
      ref,
      formTypeName: isMerg ? 'MERG Equipment Request' : 'SFI Waiver',
      stepSequence: activeStep.sequence,
      stepRoleLabel: activeStep.approverRole.replace(/_/g, ' '),
      approver,
      requester: submission.requester,
      dept: String(fields.dept ?? fields.department ?? ''),
      description: isMerg
        ? String(fields.desc ?? fields.model ?? '')
        : String(fields.descriptionOfGoodsServices ?? ''),
      supplier: String(fields.proposedSupplier ?? ''),
      totalValue: submission.totalValueIncVat,
      approvalChain,
      trust: submission.trust,
      to,
      cc,
    };

    const draft = isMerg ? buildNotificationEmail(ctx) : buildWaiverNotificationEmail(ctx);

    await prisma.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'EMAIL_GENERATED',
        detail: `Notification email generated for step ${activeStep.sequence} — ${activeStep.approverRole} (${approver.name}, ${approver.email}).`,
      },
    });

    return NextResponse.json(draft);
  }

  // ── Quote request ───────────────────────────────────────────────────────────
  if (templateType === 'quote_request') {
    if (!isMerg) {
      return NextResponse.json({ error: 'Quote request email is only available for MERG submissions' }, { status: 400 });
    }

    const supplierName = String(fields.proposedSupplier ?? '');
    const to = computeMergQuoteTo(supplierName || '[supplier not specified]');
    const cc = computeMergQuoteCc();

    const ctx = {
      ref,
      description: String(fields.desc ?? ''),
      model: String(fields.model ?? ''),
      supplier: supplierName || '[supplier not specified]',
      qty: String(fields.qty ?? '[qty not specified]'),
      productLink: String(fields.productLink ?? ''),
      dept: String(fields.dept ?? ''),
      trust: submission.trust,
      requester: submission.requester,
      to,
      cc,
    };

    const draft = buildQuoteRequestEmail(ctx);

    await prisma.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'EMAIL_GENERATED',
        detail: `MERG SOP email generated: Request for Quote (supplier: ${supplierName || '[unknown]'}).`,
      },
    });

    return NextResponse.json(draft);
  }

  // ── Concluded (purchasing or leasing) ──────────────────────────────────────
  if (templateType === 'concluded_purchasing' || templateType === 'concluded_leasing') {
    if (!isMerg) {
      return NextResponse.json({ error: 'Concluded email is only available for MERG submissions' }, { status: 400 });
    }

    const careGroup = parseInt(String(fields.careGroup ?? '1'), 10);
    const fmEmail = CARE_GROUP_FM_EMAIL[careGroup] ?? CARE_GROUP_FM_EMAIL[1];
    const cgmEmail = CARE_GROUP_MANAGER_EMAIL[careGroup] ?? CARE_GROUP_MANAGER_EMAIL[1];
    const cgmName = CARE_GROUP_MANAGER_NAME[careGroup] ?? CARE_GROUP_MANAGER_NAME[1];

    const fmUser = await prisma.user.findUnique({ where: { email: fmEmail } });
    const fmName = fmUser?.name ?? `Finance Manager (CG${careGroup})`;

    const mf = {
      requester: submission.requester,
      fmEmail,
      fmName,
      cgmEmail,
      cgmName,
      site: String(fields.site ?? ''),
      fundingSource: String(fields.fundingSource ?? ''),
      maint: String(fields.maint ?? ''),
      isShyps: String(fields.isShyps ?? 'No'),
      urnRequested: String(fields.urnRequested ?? 'No'),
    };

    const isLeasing = templateType === 'concluded_leasing';
    const to = computeMergConcludedTo(mf, isLeasing);
    const cc = computeMergConcludedCc();

    const ctx = {
      ref,
      description: String(fields.desc ?? ''),
      model: String(fields.model ?? ''),
      supplier: String(fields.proposedSupplier ?? ''),
      capitalCost: Number(fields.capitalCostExVat ?? 0),
      totalCost: submission.totalValueIncVat,
      fundingSource: String(fields.fundingSource ?? ''),
      fundName: fields.fundName ? String(fields.fundName) : undefined,
      fundNo: fields.fundNo ? String(fields.fundNo) : undefined,
      careGroup: `Care Group ${careGroup}`,
      dept: String(fields.dept ?? ''),
      site: String(fields.site ?? ''),
      requester: submission.requester,
      maint: String(fields.maint ?? ''),
      isShyps: String(fields.isShyps ?? 'No'),
      to,
      cc,
    };

    const draft = isLeasing
      ? buildConcludedLeasingEmail(ctx)
      : buildConcludedPurchasingEmail(ctx);

    const toList = to.map((r) => r.email).join(', ');
    await prisma.auditEvent.create({
      data: {
        submissionId,
        actorId: userId,
        action: 'EMAIL_GENERATED',
        detail: `MERG SOP email generated: Application ${isLeasing ? 'Completed (Leasing)' : 'Concluded (Purchasing)'}. To: ${toList}.`,
      },
    });

    return NextResponse.json(draft);
  }

  return NextResponse.json({ error: 'Unhandled template type' }, { status: 400 });
}
