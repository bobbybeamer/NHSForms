'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../../UserContext';

interface DecidedBy {
  id: string;
  name: string;
}

interface ApprovalStep {
  id: string;
  sequence: number;
  approverRole: string;
  status: string;
  decisionNote?: string | null;
  decidedBy?: DecidedBy | null;
  decidedAt?: string | null;
}

interface AuditEvent {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
  actor: { id: string; name: string };
}

interface Requester {
  id: string;
  name: string;
  email: string;
  role: string;
  trust: string;
}

interface Submission {
  id: string;
  formTypeKey: string;
  trust: string;
  status: string;
  totalValueIncVat: number;
  fieldValues: string;
  createdAt: string;
  updatedAt: string;
  requester: Requester;
  approvalSteps: ApprovalStep[];
  auditEvents: AuditEvent[];
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_APPROVAL: 'bg-blue-100 text-blue-800',
  INFO_REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const STEP_STATUS_ICON: Record<string, string> = {
  PENDING: '○',
  ACTIVE: '▶',
  APPROVED: '✓',
  REJECTED: '✗',
  INFO_REQUESTED: '?',
};

const STEP_STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-gray-400',
  ACTIVE: 'text-blue-600 font-semibold',
  APPROVED: 'text-green-700',
  REJECTED: 'text-red-700',
  INFO_REQUESTED: 'text-amber-700',
};

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    REQUESTER: 'Requester',
    PROCUREMENT_BP: 'Procurement BP',
    FINANCE: 'Finance',
    DIRECTOR_OF_PROCUREMENT: 'Director of Procurement',
    CFO: 'CFO',
    EXEC_COMMITTEE: 'Exec Committee',
    TRUST_BOARD: 'Trust Board',
    FINANCE_MANAGER: 'Finance Manager',
    DIVISIONAL_LEAD: 'Divisional Lead',
    MERG_COMMITTEE: 'MERG Committee',
  };
  return labels[role] ?? role;
}

function statusLabel(s: string) {
  return s.replace(/_/g, ' ');
}

function formatGBP(value: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 0,
  }).format(value);
}

function justificationLabel(val: string): string {
  const map: Record<string, string> = {
    a: 'a – Chief Executive Directive',
    b: 'b – Continuity of Service',
    c: 'c – Legal Advice',
    d: 'd – Nationally Funded Programme',
    e: 'e – Only Supplier',
    f: 'f – Standardisation',
    g: 'g – Urgent Requirement',
    h: 'h – Prototype / Research',
  };
  return map[val] ?? val;
}

function whyLabel(val: string): string {
  const map: Record<string, string> = {
    replacement: 'Replacement of existing equipment',
    new: 'New / additional equipment',
    capital: 'Capital scheme linked',
  };
  return map[val] ?? val;
}

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="col-span-2 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function SubmissionDetailPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [fetching, setFetching] = useState(true);
  const [decisionNote, setDecisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/submissions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setSubmission(data);
        setFetching(false);
      })
      .catch(() => {
        setFetching(false);
      });
  }, [id]);

  const activeStep = submission?.approvalSteps.find((s) => s.status === 'ACTIVE');
  const canAct = !!(activeStep && user && user.role === activeStep.approverRole);

  const handleDecide = async (action: 'approve' | 'reject' | 'info_request') => {
    if (!activeStep || !submission) return;
    setActionError(null);
    setDeciding(true);
    try {
      const res = await fetch(`/api/submissions/${submission.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: decisionNote, stepId: activeStep.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error ?? 'Action failed');
        setDeciding(false);
        return;
      }
      const updated = await res.json();
      setSubmission(updated);
      setDecisionNote('');
      setDeciding(false);
    } catch {
      setActionError('Network error. Please try again.');
      setDeciding(false);
    }
  };

  if (loading || !user || fetching) {
    return <div className="text-gray-500">Loading...</div>;
  }

  if (!submission) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">Submission not found.</p>
        <Link href="/dashboard" className="text-[#005EB8] hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const fields = (() => {
    try { return JSON.parse(submission.fieldValues); } catch { return {}; }
  })();

  const ref = submission.id.slice(-8).toUpperCase();
  const isMerg = submission.formTypeKey === 'merg_equipment';
  const formTypeName = isMerg ? 'MERG Equipment Request' : 'SFI Waiver';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:underline text-[#005EB8]">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/my-requests" className="hover:underline text-[#005EB8]">My Requests</Link>
        <span className="mx-2">/</span>
        <span>{formTypeName} {ref}</span>
      </nav>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 font-mono mb-1">
              {formTypeName} &middot; Ref: {ref}
            </p>
            <h1 className="text-xl font-bold text-gray-900">
              {isMerg
                ? (fields.desc ?? fields.model ?? 'MERG Equipment Request')
                : (fields.descriptionOfGoodsServices ?? 'Waiver Request')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {submission.trust} &middot; Submitted {new Date(submission.createdAt).toLocaleDateString('en-GB')}
            </p>
          </div>
          <span className={`inline-block text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_BADGE[submission.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {statusLabel(submission.status)}
          </span>
        </div>
      </div>

      {/* Field values */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {isMerg ? 'Equipment request details' : 'Waiver details'}
        </h2>
        <dl>
          {isMerg ? (
            /* ── MERG field summary ── */
            <>
              <FieldRow label="Care group" value={fields.careGroup ? `Care Group ${fields.careGroup}` : undefined} />
              <FieldRow label="Department" value={fields.dept} />
              <FieldRow label="Site" value={fields.site} />
              <FieldRow label="Proposed supplier" value={fields.proposedSupplier} />
              <FieldRow label="Model / product" value={fields.model} />
              <FieldRow label="Quantity" value={fields.qty} />
              <FieldRow label="Description" value={fields.desc} />
              <FieldRow label="Why required" value={whyLabel(fields.why)} />
              {fields.why === 'replacement' && (
                <>
                  <FieldRow label="Asset number (replaced)" value={fields.assetNo} />
                  <FieldRow label="Approximate age" value={fields.approxAge} />
                  <FieldRow label="Lease number" value={fields.leaseNo} />
                </>
              )}
              {fields.why === 'capital' && (
                <>
                  <FieldRow label="Capital PM" value={fields.capPm} />
                  <FieldRow label="Capital scheme" value={fields.capScheme} />
                </>
              )}
              <FieldRow label="Capital cost ex VAT" value={fields.capitalCostExVat != null ? formatGBP(fields.capitalCostExVat) : undefined} />
              <FieldRow label="Annual maintenance cost" value={fields.annualMaintCost != null ? formatGBP(fields.annualMaintCost) : undefined} />
              <FieldRow label="Annual consumables cost" value={fields.consumablesCost != null ? formatGBP(fields.consumablesCost) : undefined} />
              <FieldRow label="Anticipated life" value={fields.anticipatedLife} />
              <FieldRow label="Total estimated project cost" value={formatGBP(submission.totalValueIncVat)} />
              <FieldRow label="Funding source" value={fields.fundingSource} />
              {fields.fundingSource === 'Charity' && (
                <>
                  <FieldRow label="Fund name" value={fields.fundName} />
                  <FieldRow label="Fund number" value={fields.fundNo} />
                </>
              )}
              <FieldRow label="Award route" value={fields.awardRoute === 'direct_award' ? 'Direct award (off-framework)' : 'Framework agreement'} />
              <FieldRow label="Conflict of interest" value={fields.coi} />
              {fields.coi === 'Yes' && <FieldRow label="COI details" value={fields.coiDetails} />}
              <FieldRow label="Requester" value={submission.requester?.name} />
            </>
          ) : (
            /* ── Waiver field summary ── */
            <>
              <FieldRow label="Trust" value={fields.trust} />
              <FieldRow label="Department" value={fields.department} />
              <FieldRow label="Division" value={fields.division} />
              <FieldRow label="Source of funding" value={fields.sourceOfFunding} />
              <FieldRow label="Description" value={fields.descriptionOfGoodsServices} />
              <FieldRow label="Proposed supplier" value={fields.proposedSupplier} />
              <FieldRow label="Contract period" value={fields.contractPeriod} />
              <FieldRow label="Purchase value ex VAT" value={fields.purchaseValueExVat != null ? formatGBP(fields.purchaseValueExVat) : undefined} />
              <FieldRow label="VAT" value={fields.vat != null ? formatGBP(fields.vat) : undefined} />
              <FieldRow label="Total value inc VAT" value={formatGBP(submission.totalValueIncVat)} />
              <FieldRow label="Conflict of interest" value={fields.conflictOfInterest} />
              {fields.conflictOfInterest === 'Yes' && (
                <FieldRow label="Conflict details" value={fields.conflictDetails} />
              )}
              <FieldRow label="Justification reason" value={justificationLabel(fields.justificationReason)} />
              <FieldRow label="How waiver meets circumstances" value={fields.waiverCircumstances} />
              <FieldRow label="Requester" value={submission.requester?.name} />
              <FieldRow label="Date" value={fields.date ? new Date(fields.date).toLocaleDateString('en-GB') : undefined} />
            </>
          )}
        </dl>
      </div>

      {/* Approval chain */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Approval chain</h2>
        <ol className="space-y-3" aria-label="Approval steps">
          {submission.approvalSteps.map((step) => (
            <li
              key={step.id}
              className={`flex gap-4 p-3 rounded-lg ${step.status === 'ACTIVE' ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}
            >
              <div className={`text-lg w-6 text-center flex-shrink-0 ${STEP_STATUS_COLOR[step.status] ?? ''}`}>
                {STEP_STATUS_ICON[step.status] ?? '○'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">
                    Step {step.sequence}: {roleLabel(step.approverRole)}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    step.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    step.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    step.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                    step.status === 'INFO_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {statusLabel(step.status)}
                  </span>
                </div>
                {step.decidedBy && (
                  <p className="text-xs text-gray-500 mt-1">
                    {step.decidedBy.name}
                    {step.decidedAt && ` · ${new Date(step.decidedAt).toLocaleString('en-GB')}`}
                  </p>
                )}
                {step.decisionNote && (
                  <p className="text-sm text-gray-700 mt-1 italic">&ldquo;{step.decisionNote}&rdquo;</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Decision panel */}
      {canAct && activeStep && (
        <div className="bg-white border border-[#005EB8] rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Your decision</h2>
          <p className="text-sm text-gray-500 mb-4">
            You are acting as <strong>{roleLabel(user.role)}</strong> on step {activeStep.sequence}.
          </p>

          {actionError && (
            <div className="bg-red-50 border border-red-300 text-red-800 rounded p-3 mb-4 text-sm" role="alert">
              {actionError}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="decisionNote" className="block text-sm font-medium text-gray-700 mb-1">
              Decision note <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <textarea
              id="decisionNote"
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
              placeholder="Add a note to record your decision rationale"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleDecide('approve')}
              disabled={deciding || !decisionNote.trim()}
              className="bg-green-700 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              Approve &amp; Advance
            </button>
            <button
              onClick={() => handleDecide('info_request')}
              disabled={deciding || !decisionNote.trim()}
              className="bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              Request More Information
            </button>
            <button
              onClick={() => handleDecide('reject')}
              disabled={deciding || !decisionNote.trim()}
              className="bg-red-700 text-white text-sm font-medium px-4 py-2 rounded hover:bg-red-800 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">A decision note is required before acting.</p>
        </div>
      )}

      {/* Info requested — show requester note */}
      {submission.status === 'INFO_REQUESTED' && user.id === submission.requester?.id && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-1">More information requested</h2>
          <p className="text-sm text-amber-800">
            An approver has requested additional information. Please contact the relevant approver directly to provide clarification.
            Once clarification is provided, they will re-assess the submission.
          </p>
        </div>
      )}

      {/* Audit trail */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Audit trail</h2>
        {submission.auditEvents.length === 0 ? (
          <p className="text-sm text-gray-400">No events yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 ml-3 space-y-4" aria-label="Audit events">
            {submission.auditEvents.map((event) => (
              <li key={event.id} className="ml-4">
                <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-[#005EB8] border-2 border-white" aria-hidden="true" />
                <div className="text-xs text-gray-400 mb-0.5">
                  {new Date(event.createdAt).toLocaleString('en-GB')} &middot; {event.actor?.name}
                </div>
                <p className="text-sm font-medium text-gray-800">
                  <span className={`mr-2 text-xs font-semibold px-1.5 py-0.5 rounded ${
                    event.action === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    event.action === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    event.action === 'INFO_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {event.action.replace(/_/g, ' ')}
                  </span>
                  {event.detail}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
