import { PrismaClient } from '@prisma/client';
import { Role, SubmissionStatus, ApprovalStepStatus } from '../src/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.auditEvent.deleteMany();
  await prisma.approvalStep.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.formType.deleteMany();
  await prisma.user.deleteMany();

  // Create form types
  const formType = await prisma.formType.create({
    data: {
      key: 'sfi_waiver',
      name: 'SFI Waiver',
      version: '1.0',
    },
  });
  console.log('Created FormType:', formType.key);

  const mergFormType = await prisma.formType.create({
    data: { key: 'merg_equipment', name: 'MERG Equipment Request', version: '1.0' },
  });
  console.log('Created FormType:', mergFormType.key);

  // Create demo users (original 7)
  const requester = await prisma.user.create({
    data: {
      name: 'Reqi Requester',
      email: 'reqi.requester@nhs.net',
      role: Role.REQUESTER,
      trust: 'York & Scarborough',
    },
  });

  const procurementBP = await prisma.user.create({
    data: {
      name: 'Pat Procurement',
      email: 'pat.procurement@nhs.net',
      role: Role.PROCUREMENT_BP,
      trust: 'York & Scarborough',
    },
  });

  const finance = await prisma.user.create({
    data: {
      name: 'Fiona Finance',
      email: 'fiona.finance@nhs.net',
      role: Role.FINANCE,
      trust: 'York & Scarborough',
    },
  });

  const director = await prisma.user.create({
    data: {
      name: 'Derek Director',
      email: 'derek.director@nhs.net',
      role: Role.DIRECTOR_OF_PROCUREMENT,
      trust: 'York & Scarborough',
    },
  });

  const cfo = await prisma.user.create({
    data: {
      name: 'Cara CFO',
      email: 'cara.cfo@nhs.net',
      role: Role.CFO,
      trust: 'York & Scarborough',
    },
  });

  const exec = await prisma.user.create({
    data: {
      name: 'Eli Exec',
      email: 'eli.exec@nhs.net',
      role: Role.EXEC_COMMITTEE,
      trust: 'York & Scarborough',
    },
  });

  const board = await prisma.user.create({
    data: {
      name: 'Trudy Board',
      email: 'trudy.board@nhs.net',
      role: Role.TRUST_BOARD,
      trust: 'York & Scarborough',
    },
  });

  console.log('Created 7 demo users');

  // New MERG-related users
  const fmCg1 = await prisma.user.create({ data: { name: 'Fatima Manager (CG1)', email: 'fm.cg1@nhs.net', role: Role.FINANCE_MANAGER, trust: 'York & Scarborough' } });
  const fmCg2 = await prisma.user.create({ data: { name: 'Felix Manager (CG2)', email: 'fm.cg2@nhs.net', role: Role.FINANCE_MANAGER, trust: 'York & Scarborough' } });
  const fmCg3 = await prisma.user.create({ data: { name: 'Frances Manager (CG3)', email: 'fm.cg3@nhs.net', role: Role.FINANCE_MANAGER, trust: 'York & Scarborough' } });
  const divisionalLead = await prisma.user.create({ data: { name: 'Demi Divisional', email: 'demi.divisional@nhs.net', role: Role.DIVISIONAL_LEAD, trust: 'York & Scarborough' } });
  const mergCommittee = await prisma.user.create({ data: { name: 'Marcus MERG', email: 'marcus.merg@nhs.net', role: Role.MERG_COMMITTEE, trust: 'York & Scarborough' } });

  console.log('Created 5 MERG demo users');

  // ─── APPROVED waiver (£40,000 – goes to Director of Procurement) ────────
  const approvedWaiver = await prisma.submission.create({
    data: {
      formTypeKey: 'sfi_waiver',
      requesterId: requester.id,
      trust: 'York & Scarborough',
      status: SubmissionStatus.APPROVED,
      totalValueIncVat: 40000,
      fieldValues: JSON.stringify({
        trust: 'York & Scarborough',
        department: 'Radiology',
        division: 'Diagnostics',
        sourceOfFunding: 'Revenue',
        descriptionOfGoodsServices: 'Replacement MRI contrast media consumables from existing approved supplier',
        purchaseValueExVat: 33333,
        vat: 6667,
        totalValueIncVat: 40000,
        proposedSupplier: 'Guerbet UK Ltd',
        contractPeriod: '12 months',
        conflictOfInterest: 'No',
        conflictDetails: '',
        justificationReason: 'f',
        waiverCircumstances: 'Continuity with existing approved supplier avoids re-validation costs and maintains patient safety standards already established under current contract.',
        requesterName: 'Reqi Requester',
        date: '2025-11-15',
      }),
    },
  });

  // Create all 3 approval steps for the APPROVED waiver, all APPROVED
  await prisma.approvalStep.create({
    data: {
      submissionId: approvedWaiver.id,
      sequence: 1,
      approverRole: Role.PROCUREMENT_BP,
      status: ApprovalStepStatus.APPROVED,
      decisionNote: 'Supplier is on approved framework. Waiver justified.',
      decidedById: procurementBP.id,
      decidedAt: new Date('2025-11-16T09:30:00Z'),
    },
  });

  await prisma.approvalStep.create({
    data: {
      submissionId: approvedWaiver.id,
      sequence: 2,
      approverRole: Role.FINANCE,
      status: ApprovalStepStatus.APPROVED,
      decisionNote: 'Budget confirmed available. Value within delegated authority.',
      decidedById: finance.id,
      decidedAt: new Date('2025-11-17T14:00:00Z'),
    },
  });

  await prisma.approvalStep.create({
    data: {
      submissionId: approvedWaiver.id,
      sequence: 3,
      approverRole: Role.DIRECTOR_OF_PROCUREMENT,
      status: ApprovalStepStatus.APPROVED,
      decisionNote: 'Approved. Value below PA23 threshold. Standardisation justification accepted.',
      decidedById: director.id,
      decidedAt: new Date('2025-11-18T10:15:00Z'),
    },
  });

  // Create full audit trail for approved waiver
  await prisma.auditEvent.create({
    data: {
      submissionId: approvedWaiver.id,
      actorId: requester.id,
      action: 'SUBMITTED',
      detail: 'Submission created and submitted for approval.',
      createdAt: new Date('2025-11-15T16:00:00Z'),
    },
  });

  await prisma.auditEvent.create({
    data: {
      submissionId: approvedWaiver.id,
      actorId: procurementBP.id,
      action: 'APPROVED',
      detail: 'Step 1 (Procurement BP): Supplier is on approved framework. Waiver justified.',
      createdAt: new Date('2025-11-16T09:30:00Z'),
    },
  });

  await prisma.auditEvent.create({
    data: {
      submissionId: approvedWaiver.id,
      actorId: finance.id,
      action: 'APPROVED',
      detail: 'Step 2 (Finance): Budget confirmed available. Value within delegated authority.',
      createdAt: new Date('2025-11-17T14:00:00Z'),
    },
  });

  await prisma.auditEvent.create({
    data: {
      submissionId: approvedWaiver.id,
      actorId: director.id,
      action: 'APPROVED',
      detail: 'Step 3 (Director of Procurement): Approved. Value below PA23 threshold. Standardisation justification accepted.',
      createdAt: new Date('2025-11-18T10:15:00Z'),
    },
  });

  console.log('Created APPROVED waiver:', approvedWaiver.id);

  // ─── IN_APPROVAL waiver (£200,000 – goes to CFO) ─────────────────────────
  const inApprovalWaiver = await prisma.submission.create({
    data: {
      formTypeKey: 'sfi_waiver',
      requesterId: requester.id,
      trust: 'York & Scarborough',
      status: SubmissionStatus.IN_APPROVAL,
      totalValueIncVat: 200000,
      fieldValues: JSON.stringify({
        trust: 'York & Scarborough',
        department: 'IT & Digital',
        division: 'Corporate Services',
        sourceOfFunding: 'Capital',
        descriptionOfGoodsServices: 'Electronic patient record system upgrade and migration to cloud-hosted infrastructure',
        purchaseValueExVat: 166667,
        vat: 33333,
        totalValueIncVat: 200000,
        proposedSupplier: 'System C Healthcare Ltd',
        contractPeriod: '36 months',
        conflictOfInterest: 'No',
        conflictDetails: '',
        justificationReason: 'b',
        waiverCircumstances: 'Existing EPR supplier – migration to competitor product would require full data migration, staff retraining, and integration rebuilds estimated at 18 months downtime risk.',
        requesterName: 'Reqi Requester',
        date: '2026-06-20',
      }),
    },
  });

  // First step ACTIVE, remaining PENDING
  await prisma.approvalStep.create({
    data: {
      submissionId: inApprovalWaiver.id,
      sequence: 1,
      approverRole: Role.PROCUREMENT_BP,
      status: ApprovalStepStatus.ACTIVE,
    },
  });

  await prisma.approvalStep.create({
    data: {
      submissionId: inApprovalWaiver.id,
      sequence: 2,
      approverRole: Role.FINANCE,
      status: ApprovalStepStatus.PENDING,
    },
  });

  await prisma.approvalStep.create({
    data: {
      submissionId: inApprovalWaiver.id,
      sequence: 3,
      approverRole: Role.CFO,
      status: ApprovalStepStatus.PENDING,
    },
  });

  await prisma.auditEvent.create({
    data: {
      submissionId: inApprovalWaiver.id,
      actorId: requester.id,
      action: 'SUBMITTED',
      detail: 'Submission created and submitted for approval. Value: £200,000 inc VAT. Chain: Procurement BP → Finance → CFO.',
      createdAt: new Date('2026-06-20T11:00:00Z'),
    },
  });

  console.log('Created IN_APPROVAL waiver:', inApprovalWaiver.id);

  // ─── IN_APPROVAL MERG submission (care group 2, £30,000 total project cost) ─
  // NOTE: totalValueIncVat stores the total project cost ex VAT (MERG has no
  // separate VAT field; we store the total estimated project cost as-is).
  const mergSubmission = await prisma.submission.create({
    data: {
      formTypeKey: 'merg_equipment',
      requesterId: requester.id,
      trust: 'York & Scarborough',
      status: SubmissionStatus.IN_APPROVAL,
      totalValueIncVat: 30000,
      fieldValues: JSON.stringify({
        careGroup: '2',
        dept: 'Cardiology',
        site: 'York Hospital',
        proposedSupplier: 'Medtronic',
        model: 'LINQ II Insertable Cardiac Monitor',
        qty: '2',
        desc: 'Subcutaneous cardiac monitoring device for long-term arrhythmia detection',
        why: 'new',
        capitalCostExVat: 25000,
        annualMaintCost: 2500,
        consumablesCost: 2500,
        anticipatedLife: '5 years',
        totalEstimatedCost: 30000,
        fundingSource: 'MERG',
        awardRoute: 'framework',
      }),
    },
  });

  // Step 1: FINANCE_MANAGER (ACTIVE, assigned to fmCg2)
  await prisma.approvalStep.create({
    data: {
      submissionId: mergSubmission.id,
      sequence: 1,
      approverRole: Role.FINANCE_MANAGER,
      status: ApprovalStepStatus.ACTIVE,
      assignedToId: fmCg2.id,
    },
  });

  // Step 2: DIVISIONAL_LEAD (PENDING)
  await prisma.approvalStep.create({
    data: {
      submissionId: mergSubmission.id,
      sequence: 2,
      approverRole: Role.DIVISIONAL_LEAD,
      status: ApprovalStepStatus.PENDING,
    },
  });

  // Step 3: MERG_COMMITTEE (PENDING)
  await prisma.approvalStep.create({
    data: {
      submissionId: mergSubmission.id,
      sequence: 3,
      approverRole: Role.MERG_COMMITTEE,
      status: ApprovalStepStatus.PENDING,
    },
  });

  await prisma.auditEvent.create({
    data: {
      submissionId: mergSubmission.id,
      actorId: requester.id,
      action: 'SUBMITTED',
      detail: 'Submission created and submitted for approval. Total estimated cost: £30,000. Chain: Finance Manager → Divisional Lead → MERG Committee.',
      createdAt: new Date('2026-06-28T10:00:00Z'),
    },
  });

  console.log('Created IN_APPROVAL MERG submission:', mergSubmission.id);
  console.log('Seeding complete.');

  // Suppress unused variable warnings
  void fmCg1;
  void fmCg3;
  void cfo;
  void exec;
  void board;
  void divisionalLead;
  void mergCommittee;
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
