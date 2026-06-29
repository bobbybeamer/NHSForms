'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../../UserContext';
import { getMergProcThresholdExVat } from '@/config/mergRouting';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MergFormData {
  // Step 2: COI
  coi: string;
  coiDetails: string;
  // Step 3: Requester
  rqName: string;
  rqRole: string;
  contact: string;
  rqEmail: string;
  dept: string;
  site: string;
  careGroup: string;
  isShyps: string; // 'Yes' | 'No' — drives email recipient rules
  // Step 4: Environment
  envEnergy: string;
  envExplanation: string;
  socialValue: string;
  svExplanation: string;
  // Step 5: Equipment
  proposedSupplier: string;
  model: string;
  qty: string;
  productLink: string;
  mpc: string;
  onReplacementPlan: string;
  whereUsed: string;
  desc: string;
  why: string;
  needsWorks: string;
  worksScope: string;
  assetNo: string;
  approxAge: string;
  leaseNo: string;
  capPm: string;
  capScheme: string;
  // Step 6: Case of Need
  caseNeed: string;
  patientRisk: string;
  datix: string;
  datixDetails: string;
  nice: string;
  niceDetails: string;
  // Step 7: Risk Checks
  needsNet: string;
  itRef: string;
  itAdvice: string;
  storesPid: string;
  dtacConfirm: string;
  dpiaConfirm: string;
  imaging: string;
  physConfirm: string;
  pacsAdviceConfirm: string;
  pacs: string;
  training: string;
  trainNotes: string;
  maint: string;
  maintNotes: string;
  // Step 8: Legal Procurement
  supplier1: string;
  supplier2: string;
  supplier3: string;
  procSelect: string;
  procDetails: string;
  urnRequested: string; // 'Yes' | 'No' — whether a URN was requested from NHS Supply Chain
  // Step 9: Financial
  anticipatedLife: string;
  capitalCostExVat: string;
  annualMaintCost: string;
  consumablesCost: string;
  awardRoute: string;
  fundingSource: string;
  fundName: string;
  fundNo: string;
  charityDate: string;
  charityNotes: string;
}

const EMPTY_FORM: MergFormData = {
  coi: '', coiDetails: '',
  rqName: '', rqRole: '', contact: '', rqEmail: '', dept: '', site: '', careGroup: '', isShyps: '',
  envEnergy: '', envExplanation: '', socialValue: '', svExplanation: '',
  proposedSupplier: '', model: '', qty: '', productLink: '', mpc: '', onReplacementPlan: '',
  whereUsed: '', desc: '', why: '', needsWorks: '', worksScope: '',
  assetNo: '', approxAge: '', leaseNo: '', capPm: '', capScheme: '',
  caseNeed: '', patientRisk: '', datix: '', datixDetails: '', nice: '', niceDetails: '',
  needsNet: '', itRef: '', itAdvice: '', storesPid: '', dtacConfirm: '', dpiaConfirm: '',
  imaging: '', physConfirm: '', pacsAdviceConfirm: '', pacs: '',
  training: '', trainNotes: '', maint: '', maintNotes: '',
  supplier1: '', supplier2: '', supplier3: '', procSelect: '', procDetails: '', urnRequested: '',
  anticipatedLife: '', capitalCostExVat: '', annualMaintCost: '', consumablesCost: '',
  awardRoute: '', fundingSource: '', fundName: '', fundNo: '', charityDate: '', charityNotes: '',
};

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, title: 'Welcome' },
  { number: 2, title: 'Conflict of Interest' },
  { number: 3, title: 'Requester Details' },
  { number: 4, title: 'Environment & Social Value' },
  { number: 5, title: 'Equipment Details' },
  { number: 6, title: 'Case of Need' },
  { number: 7, title: 'Risk Checks' },
  { number: 8, title: 'Legal & Procurement' },
  { number: 9, title: 'Financial' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatGBP(val: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(val);
}

// ─── Small reusable field components ─────────────────────────────────────────

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
  );
}

function Input({ id, value, onChange, required, placeholder, type = 'text', readOnly }: {
  id: string; value: string; onChange: (v: string) => void;
  required?: boolean; placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      aria-required={required ? 'true' : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8] ${readOnly ? 'bg-gray-50 text-gray-500' : ''}`}
    />
  );
}

function Select({ id, value, onChange, required, children }: {
  id: string; value: string; onChange: (v: string) => void;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      aria-required={required ? 'true' : undefined}
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8] bg-white"
    >
      {children}
    </select>
  );
}

function Textarea({ id, value, onChange, rows = 4, placeholder, required }: {
  id: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; required?: boolean;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      required={required}
      aria-required={required ? 'true' : undefined}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
    />
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-5">{children}</div>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MergNewPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<MergFormData>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([1]));
  // Thresholds fetched live from DB — no hardcoded values in this file.
  const [businessCaseThreshold, setBusinessCaseThreshold] = useState(50_000);
  const [staThreshold, setStaThreshold] = useState(25_000);
  // Pre-render default only — overwritten immediately by /api/thresholds fetch below.
  // Not a policy value: do not use this as a routing boundary.
  const [pa23IncVat, setPa23IncVat] = useState(135_018);

  // Auto-fill requester info from logged-in user
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user && !form.rqName) {
      setForm((f) => ({ ...f, rqName: user.name, rqEmail: user.email }));
    }
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all thresholds from database on mount.
  useEffect(() => {
    fetch('/api/thresholds')
      .then((r) => r.json())
      .then((rows: { key: string; value: number }[]) => {
        const get = (k: string) => rows.find((r) => r.key === k)?.value;
        if (get('merg_business_case_ex_vat')) setBusinessCaseThreshold(get('merg_business_case_ex_vat')!);
        if (get('merg_sta_ex_vat')) setStaThreshold(get('merg_sta_ex_vat')!);
        if (get('pa23_inc_vat')) setPa23IncVat(get('pa23_inc_vat')!);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // ─── Field updater ─────────────────────────────────────────────────────────
  const set = (field: keyof MergFormData) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ─── Financial calculations ────────────────────────────────────────────────
  const years = parseInt(form.anticipatedLife) || 0;
  const capital = parseFloat(form.capitalCostExVat) || 0;
  const maint = (parseFloat(form.annualMaintCost) || 0) * years;
  const cons = (parseFloat(form.consumablesCost) || 0) * years;
  const totalEstimatedCost = capital + maint + cons;

  const showBusinessCase = totalEstimatedCost > businessCaseThreshold;
  const showSta = form.awardRoute === 'direct_award' && capital >= staThreshold;
  const mergProcThresholdExVat = getMergProcThresholdExVat(pa23IncVat);
  const showProcThreshold = totalEstimatedCost > mergProcThresholdExVat;

  const approvalChainLabel = showBusinessCase
    ? 'Finance Manager → Divisional Lead → MERG Committee → Exec Committee'
    : 'Finance Manager → Divisional Lead → MERG Committee';

  // ─── Step validation ────────────────────────────────────────────────────────
  function validateStep(s: number): string | null {
    switch (s) {
      case 2:
        if (!form.coi) return 'Please declare your conflict of interest status.';
        if (form.coi === 'Yes' && !form.coiDetails.trim()) return 'Please provide conflict of interest details.';
        break;
      case 3:
        if (!form.rqRole.trim()) return 'Job title / role is required.';
        if (!form.contact.trim()) return 'Contact number is required.';
        if (!form.dept.trim()) return 'Department is required.';
        if (!form.site.trim()) return 'Site is required.';
        if (!form.careGroup) return 'Care group is required.';
        break;
      case 4:
        if (!form.envEnergy) return 'Please answer the energy / environmental question.';
        if (!form.socialValue) return 'Please answer the social value question.';
        break;
      case 5:
        if (!form.proposedSupplier.trim()) return 'Proposed supplier is required.';
        if (!form.model.trim()) return 'Model / product name is required.';
        if (!form.qty.trim()) return 'Quantity is required.';
        if (!form.whereUsed.trim()) return 'Location / where used is required.';
        if (!form.desc.trim()) return 'Equipment description is required.';
        if (!form.why) return 'Please select why the equipment is required.';
        if (form.needsWorks === 'Yes' && !form.worksScope.trim()) return 'Works scope is required when works are needed.';
        if (form.why === 'replacement') {
          if (!form.assetNo.trim()) return 'Asset number is required for replacements.';
        }
        break;
      case 6:
        if (!form.caseNeed.trim()) return 'Case of need is required.';
        if (!form.patientRisk.trim()) return 'Patient risk statement is required.';
        if (!form.datix) return 'Please answer the Datix question.';
        if (form.datix === 'Yes' && !form.datixDetails.trim()) return 'Datix reference / details are required.';
        if (!form.nice) return 'Please answer the NICE guidance question.';
        break;
      case 7:
        if (!form.needsNet) return 'Please answer whether network connectivity is required.';
        if (!form.storesPid) return 'Please answer the stores / PID question.';
        if (!form.imaging) return 'Please answer the imaging question.';
        if (!form.pacs) return 'Please answer the PACS question.';
        if (!form.training) return 'Please answer the training question.';
        if (!form.maint) return 'Please select a maintenance route.';
        break;
      case 8:
        if (!form.supplier1.trim()) return 'At least one supplier / quote is required.';
        if (form.procSelect && !form.procDetails.trim()) return 'Please provide procurement framework details.';
        break;
      case 9:
        if (!form.anticipatedLife) return 'Anticipated life is required.';
        if (!form.capitalCostExVat) return 'Capital cost is required.';
        if (!form.awardRoute) return 'Award route is required.';
        if (!form.fundingSource) return 'Funding source is required.';
        break;
    }
    return null;
  }

  // ─── Navigation ────────────────────────────────────────────────────────────
  function goToStep(target: number) {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      setError(null);
      return;
    }
    // Validate current step before advancing
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setVisitedSteps((prev) => new Set([...prev, target]));
    setStep(target);
  }

  function handleNext() {
    if (step < 9) goToStep(step + 1);
  }

  function handleBack() {
    if (step > 1) {
      setError(null);
      setStep((s) => s - 1);
    }
  }

  // ─── Submission ─────────────────────────────────────────────────────────────
  async function handleSubmit(action: 'submit' | 'draft') {
    if (action === 'submit') {
      const err = validateStep(9);
      if (err) { setError(err); return; }
    }
    setError(null);
    setSubmitting(true);

    const fieldValues = {
      ...form,
      totalEstimatedCost,
      capitalCostExVat: capital,
      annualMaintCost: parseFloat(form.annualMaintCost) || 0,
      consumablesCost: parseFloat(form.consumablesCost) || 0,
    };

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formTypeKey: 'merg_equipment',
          trust: user?.trust ?? 'York & Scarborough',
          fieldValues,
          // NOTE: totalValueIncVat stores total estimated project cost ex VAT.
          // MERG has no separate VAT field; this is an assumption — confirm with client.
          totalValueIncVat: totalEstimatedCost,
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }

      const submission = await res.json();
      router.push(`/submissions/${submission.id}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  // ─── Computed attachments checklist (step 7, not stored) ──────────────────
  const attachments: string[] = [];
  if (form.storesPid === 'Yes') {
    attachments.push('DTAC assessment', 'DPIA documentation');
  }
  if (form.imaging === 'Yes' || form.pacs === 'Yes') {
    attachments.push('Physics sign-off', 'PACS/imaging advice confirmation');
  }
  if (form.needsNet === 'Yes') {
    attachments.push('IT & Digital reference / advice');
  }
  if (form.datix === 'Yes') {
    attachments.push('Datix report reference');
  }
  if (form.nice === 'Yes') {
    attachments.push('NICE guidance reference');
  }

  if (loading || !user) {
    return <div className="text-gray-500 p-8">Loading...</div>;
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:underline text-[#005EB8]">Dashboard</Link>
        <span className="mx-2">/</span>
        <span>New MERG Equipment Request</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">MERG Equipment Request</h1>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Left Navigation ── */}
        <nav className="md:w-56 flex-shrink-0" aria-label="Form steps">
          <ol className="space-y-1">
            {STEPS.map((s) => {
              const isActive = s.number === step;
              const isVisited = visitedSteps.has(s.number) && s.number !== step;
              return (
                <li key={s.number}>
                  <button
                    onClick={() => goToStep(s.number)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'text-white font-semibold'
                        : isVisited
                          ? 'text-green-700 bg-green-50 hover:bg-green-100'
                          : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    style={isActive ? { backgroundColor: '#005EB8' } : undefined}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${
                      isActive ? 'bg-white text-[#005EB8]'
                        : isVisited ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                    }`}>
                      {isVisited ? '✓' : s.number}
                    </span>
                    <span className="truncate">{s.title}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile step indicator */}
          <div className="md:hidden mb-4 text-sm text-gray-500 font-medium">
            Step {step} of {STEPS.length}: {STEPS[step - 1].title}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">
              {STEPS[step - 1].title}
            </h2>

            {/* ── Error banner ── */}
            {error && (
              <div role="alert" className="bg-red-50 border border-red-300 text-red-800 rounded p-3 mb-5 text-sm">
                {error}
              </div>
            )}

            {/* ─────────────── STEP 1: WELCOME ─────────────────────────── */}
            {step === 1 && (
              <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                <p className="font-medium text-base text-gray-900">
                  Medical Equipment Replacement Group (MERG) Equipment Request
                </p>
                <p>
                  This form is for requesting new or replacement medical equipment through the
                  Trust&apos;s MERG process. Complete all sections accurately to ensure your
                  request is assessed promptly.
                </p>
                <p>
                  <strong>Before you start, ensure you have:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Approval from your line manager to submit this request</li>
                  <li>Supplier quotes or framework references</li>
                  <li>Cost estimates (capital, annual maintenance, consumables)</li>
                  <li>A clear clinical or operational justification</li>
                  <li>Completed any required IT, physics, or DTAC assessments (where applicable)</li>
                </ul>
                <p>
                  You can save your progress as a draft at any time using the &ldquo;Save as Draft&rdquo;
                  button on the final step.
                </p>
                <p className="text-xs text-gray-500">
                  By continuing, you agree that the information you provide is accurate and
                  complete to the best of your knowledge.
                </p>
              </div>
            )}

            {/* ─────────────── STEP 2: COI ─────────────────────────────── */}
            {step === 2 && (
              <div>
                <FieldGroup>
                  <Label htmlFor="coi" required>
                    Do you have a conflict of interest in relation to this request?
                  </Label>
                  <Select id="coi" value={form.coi} onChange={set('coi')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    A conflict of interest includes any personal, financial, or professional
                    relationship with the proposed supplier.
                  </p>
                </FieldGroup>

                {form.coi === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="coiDetails" required>
                      Please describe your conflict of interest
                    </Label>
                    <Textarea
                      id="coiDetails"
                      value={form.coiDetails}
                      onChange={set('coiDetails')}
                      required
                      placeholder="Describe your relationship with the proposed supplier..."
                    />
                  </FieldGroup>
                )}
              </div>
            )}

            {/* ─────────────── STEP 3: REQUESTER ───────────────────────── */}
            {step === 3 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <FieldGroup>
                    <Label htmlFor="rqName">Full name</Label>
                    <Input id="rqName" value={form.rqName} onChange={set('rqName')} readOnly />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="rqEmail">Email</Label>
                    <Input id="rqEmail" value={form.rqEmail} onChange={set('rqEmail')} readOnly />
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldGroup>
                    <Label htmlFor="rqRole" required>Job title / role</Label>
                    <Input id="rqRole" value={form.rqRole} onChange={set('rqRole')} required placeholder="e.g. Senior Nurse" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="contact" required>Contact number</Label>
                    <Input id="contact" value={form.contact} onChange={set('contact')} required type="tel" placeholder="e.g. 01904 123456" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="dept" required>Department</Label>
                    <Input id="dept" value={form.dept} onChange={set('dept')} required placeholder="e.g. Cardiology" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="site" required>Site / hospital</Label>
                    <Input id="site" value={form.site} onChange={set('site')} required placeholder="e.g. York Hospital" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="careGroup" required>Care group</Label>
                    <Select id="careGroup" value={form.careGroup} onChange={set('careGroup')} required>
                      <option value="">-- Select care group --</option>
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={String(n)}>Care Group {n}</option>
                      ))}
                    </Select>
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="isShyps">Is this equipment for SHYPS?</Label>
                    <Select id="isShyps" value={form.isShyps} onChange={set('isShyps')}>
                      <option value="">-- Select --</option>
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      SHYPS equipment uses a different maintenance notification route. This answer affects the recipients of the concluded/completed email.
                    </p>
                  </FieldGroup>
                </div>
              </div>
            )}

            {/* ─────────────── STEP 4: ENVIRONMENT & SOCIAL VALUE ──────── */}
            {step === 4 && (
              <div>
                <FieldGroup>
                  <Label htmlFor="envEnergy" required>
                    Does this equipment have significant energy consumption or environmental impact?
                  </Label>
                  <Select id="envEnergy" value={form.envEnergy} onChange={set('envEnergy')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="envExplanation">Environmental considerations / explanation</Label>
                  <Textarea
                    id="envExplanation"
                    value={form.envExplanation}
                    onChange={set('envExplanation')}
                    placeholder="Describe any energy efficiency considerations, disposal requirements, or environmental impact..."
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="socialValue" required>
                    Does this request have social value considerations (local employment, community benefit, etc.)?
                  </Label>
                  <Select id="socialValue" value={form.socialValue} onChange={set('socialValue')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.socialValue === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="svExplanation">Social value details</Label>
                    <Textarea
                      id="svExplanation"
                      value={form.svExplanation}
                      onChange={set('svExplanation')}
                      placeholder="Describe the social value benefits..."
                    />
                  </FieldGroup>
                )}
              </div>
            )}

            {/* ─────────────── STEP 5: EQUIPMENT DETAILS ───────────────── */}
            {step === 5 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldGroup>
                    <Label htmlFor="proposedSupplier" required>Proposed supplier</Label>
                    <Input id="proposedSupplier" value={form.proposedSupplier} onChange={set('proposedSupplier')} required placeholder="e.g. Medtronic" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="model" required>Model / product name</Label>
                    <Input id="model" value={form.model} onChange={set('model')} required placeholder="e.g. LINQ II ICM" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="qty" required>Quantity</Label>
                    <Input id="qty" value={form.qty} onChange={set('qty')} required type="number" placeholder="e.g. 2" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="mpc">MPC / catalogue number</Label>
                    <Input id="mpc" value={form.mpc} onChange={set('mpc')} placeholder="Optional" />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="productLink">Product link / specification URL</Label>
                    <Input id="productLink" value={form.productLink} onChange={set('productLink')} type="url" placeholder="https://..." />
                  </FieldGroup>
                  <FieldGroup>
                    <Label htmlFor="onReplacementPlan" required>Is this item on the Trust Replacement Plan?</Label>
                    <Select id="onReplacementPlan" value={form.onReplacementPlan} onChange={set('onReplacementPlan')} required>
                      <option value="">-- Select --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                      <option value="Unknown">Unknown</option>
                    </Select>
                  </FieldGroup>
                </div>

                <FieldGroup>
                  <Label htmlFor="whereUsed" required>Where will the equipment be used?</Label>
                  <Input id="whereUsed" value={form.whereUsed} onChange={set('whereUsed')} required placeholder="e.g. Ward 12, Cardiology Department, York Hospital" />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="desc" required>
                    Brief equipment description{' '}
                    <span className={`font-normal text-xs ${countWords(form.desc) > 50 ? 'text-red-600' : 'text-gray-400'}`}>
                      ({countWords(form.desc)} / 50 words)
                    </span>
                  </Label>
                  <Textarea
                    id="desc"
                    value={form.desc}
                    onChange={set('desc')}
                    required
                    rows={3}
                    placeholder="Briefly describe the equipment and its primary function (max 50 words)..."
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="why" required>Why is this equipment required?</Label>
                  <Select id="why" value={form.why} onChange={set('why')} required>
                    <option value="">-- Select --</option>
                    <option value="replacement">Replacement of existing equipment</option>
                    <option value="new">New / additional equipment</option>
                    <option value="capital">Capital scheme linked</option>
                  </Select>
                </FieldGroup>

                {/* Conditional: replacement */}
                {form.why === 'replacement' && (
                  <div className="border-l-4 border-blue-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-blue-800 font-medium">Replacement details</p>
                    <FieldGroup>
                      <Label htmlFor="assetNo" required>Asset number of item being replaced</Label>
                      <Input id="assetNo" value={form.assetNo} onChange={set('assetNo')} required placeholder="e.g. YST-12345" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="approxAge">Approximate age of item being replaced</Label>
                      <Input id="approxAge" value={form.approxAge} onChange={set('approxAge')} placeholder="e.g. 8 years" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="leaseNo">Lease number (if applicable)</Label>
                      <Input id="leaseNo" value={form.leaseNo} onChange={set('leaseNo')} placeholder="Optional" />
                    </FieldGroup>
                  </div>
                )}

                {/* Conditional: capital */}
                {form.why === 'capital' && (
                  <div className="border-l-4 border-purple-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-purple-800 font-medium">Capital scheme details</p>
                    <FieldGroup>
                      <Label htmlFor="capPm">Capital PM / project manager</Label>
                      <Input id="capPm" value={form.capPm} onChange={set('capPm')} placeholder="Name of PM responsible for the capital scheme" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="capScheme">Capital scheme name / reference</Label>
                      <Input id="capScheme" value={form.capScheme} onChange={set('capScheme')} placeholder="e.g. ED Redevelopment Phase 2" />
                    </FieldGroup>
                  </div>
                )}

                <FieldGroup>
                  <Label htmlFor="needsWorks" required>Does installation require building / estates works?</Label>
                  <Select id="needsWorks" value={form.needsWorks} onChange={set('needsWorks')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.needsWorks === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="worksScope" required>Describe the works required</Label>
                    <Textarea id="worksScope" value={form.worksScope} onChange={set('worksScope')} required placeholder="e.g. Electrical supply upgrade, ventilation, room modification..." />
                  </FieldGroup>
                )}
              </div>
            )}

            {/* ─────────────── STEP 6: CASE OF NEED ───────────────────── */}
            {step === 6 && (
              <div>
                <FieldGroup>
                  <Label htmlFor="caseNeed" required>
                    Case of need{' '}
                    <span className={`font-normal text-xs ${countWords(form.caseNeed) > 200 ? 'text-red-600' : 'text-gray-400'}`}>
                      ({countWords(form.caseNeed)} / 200 words)
                    </span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    Describe the clinical or operational need for this equipment. Include evidence, volume of activity, and service impact if not approved.
                  </p>
                  <Textarea
                    id="caseNeed"
                    value={form.caseNeed}
                    onChange={set('caseNeed')}
                    rows={6}
                    required
                    placeholder="Describe your clinical/operational justification..."
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="patientRisk" required>
                    Patient risk / safety impact{' '}
                    <span className={`font-normal text-xs ${countWords(form.patientRisk) > 100 ? 'text-red-600' : 'text-gray-400'}`}>
                      ({countWords(form.patientRisk)} / 100 words)
                    </span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-1">
                    What is the patient safety risk if this request is not approved?
                  </p>
                  <Textarea
                    id="patientRisk"
                    value={form.patientRisk}
                    onChange={set('patientRisk')}
                    rows={4}
                    required
                    placeholder="Describe the patient safety risk..."
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="datix" required>Is there a Datix incident report relating to this request?</Label>
                  <Select id="datix" value={form.datix} onChange={set('datix')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.datix === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="datixDetails" required>Datix reference number / details</Label>
                    <Input id="datixDetails" value={form.datixDetails} onChange={set('datixDetails')} required placeholder="e.g. INC-2026-001234" />
                  </FieldGroup>
                )}

                <FieldGroup>
                  <Label htmlFor="nice" required>Is this request supported by NICE guidance or clinical standards?</Label>
                  <Select id="nice" value={form.nice} onChange={set('nice')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                    <option value="Not applicable">Not applicable</option>
                  </Select>
                </FieldGroup>
                {form.nice === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="niceDetails">NICE guidance reference / details</Label>
                    <Input id="niceDetails" value={form.niceDetails} onChange={set('niceDetails')} placeholder="e.g. NICE TA123, BSH guideline..." />
                  </FieldGroup>
                )}
              </div>
            )}

            {/* ─────────────── STEP 7: RISK CHECKS ────────────────────── */}
            {step === 7 && (
              <div>
                {/* Network connectivity */}
                <FieldGroup>
                  <Label htmlFor="needsNet" required>Does this equipment require network connectivity / IT integration?</Label>
                  <Select id="needsNet" value={form.needsNet} onChange={set('needsNet')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.needsNet === 'Yes' && (
                  <div className="border-l-4 border-blue-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-blue-800 font-medium">IT assessment required</p>
                    <FieldGroup>
                      <Label htmlFor="itRef">IT request / helpdesk reference</Label>
                      <Input id="itRef" value={form.itRef} onChange={set('itRef')} placeholder="e.g. INC-IT-2026-0001" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="itAdvice">Summary of IT advice received</Label>
                      <Textarea id="itAdvice" value={form.itAdvice} onChange={set('itAdvice')} rows={3} placeholder="Summarise IT assessment or advice..." />
                    </FieldGroup>
                  </div>
                )}

                {/* Stores / PID / DTAC */}
                <FieldGroup>
                  <Label htmlFor="storesPid" required>Does the equipment have a software / data component (requires DTAC / DPIA)?</Label>
                  <Select id="storesPid" value={form.storesPid} onChange={set('storesPid')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.storesPid === 'Yes' && (
                  <div className="border-l-4 border-amber-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-amber-800 font-medium">Data governance assessments required</p>
                    <FieldGroup>
                      <Label htmlFor="dtacConfirm">DTAC assessment status</Label>
                      <Input id="dtacConfirm" value={form.dtacConfirm} onChange={set('dtacConfirm')} placeholder="e.g. Completed – reference DTAC-2026-055" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="dpiaConfirm">DPIA status</Label>
                      <Input id="dpiaConfirm" value={form.dpiaConfirm} onChange={set('dpiaConfirm')} placeholder="e.g. Completed / In progress / Not required" />
                    </FieldGroup>
                  </div>
                )}

                {/* Imaging / PACS */}
                <FieldGroup>
                  <Label htmlFor="imaging" required>Does this equipment produce diagnostic imaging?</Label>
                  <Select id="imaging" value={form.imaging} onChange={set('imaging')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="pacs" required>Does this equipment integrate with PACS?</Label>
                  <Select id="pacs" value={form.pacs} onChange={set('pacs')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {(form.imaging === 'Yes' || form.pacs === 'Yes') && (
                  <div className="border-l-4 border-purple-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-purple-800 font-medium">Physics / PACS assessment required</p>
                    <FieldGroup>
                      <Label htmlFor="physConfirm">Physics sign-off status</Label>
                      <Input id="physConfirm" value={form.physConfirm} onChange={set('physConfirm')} placeholder="e.g. Confirmed by Medical Physics on 01/06/2026" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="pacsAdviceConfirm">PACS / imaging advice confirmation</Label>
                      <Input id="pacsAdviceConfirm" value={form.pacsAdviceConfirm} onChange={set('pacsAdviceConfirm')} placeholder="e.g. PACS team confirmed compatibility" />
                    </FieldGroup>
                  </div>
                )}

                {/* Training */}
                <FieldGroup>
                  <Label htmlFor="training" required>Does this equipment require staff training?</Label>
                  <Select id="training" value={form.training} onChange={set('training')} required>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                </FieldGroup>
                {form.training === 'Yes' && (
                  <FieldGroup>
                    <Label htmlFor="trainNotes">Training plan / notes</Label>
                    <Textarea id="trainNotes" value={form.trainNotes} onChange={set('trainNotes')} rows={3} placeholder="Who will be trained, how, and when..." />
                  </FieldGroup>
                )}

                {/* Maintenance */}
                <FieldGroup>
                  <Label htmlFor="maint" required>Maintenance route</Label>
                  <Select id="maint" value={form.maint} onChange={set('maint')} required>
                    <option value="">-- Select --</option>
                    <option value="Medical Engineering">Medical Engineering (in-house)</option>
                    <option value="Supplier contract">Supplier maintenance contract</option>
                    <option value="3rd party contract">Third-party maintenance contract</option>
                    <option value="No maintenance">No maintenance required</option>
                  </Select>
                </FieldGroup>
                {form.maint && form.maint !== 'Medical Engineering' && (
                  <FieldGroup>
                    <Label htmlFor="maintNotes">Maintenance details / contract reference</Label>
                    <Textarea id="maintNotes" value={form.maintNotes} onChange={set('maintNotes')} rows={3} placeholder="e.g. included in purchase price, annual cost, contract reference..." />
                  </FieldGroup>
                )}

                {/* Attachments checklist */}
                {attachments.length > 0 && (
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-2">
                      Required attachments for this request:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                      {attachments.map((a) => (
                        <li key={a} className="text-sm text-amber-800">{a}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-700 mt-2">
                      Please send these documents to your Finance Manager alongside this request.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─────────────── STEP 8: LEGAL & PROCUREMENT ─────────────── */}
            {step === 8 && (
              <div>
                <p className="text-sm text-gray-500 mb-5">
                  Provide details of suppliers considered. At least one supplier / quote is required.
                  If procuring off-framework, a Single Tender Action may apply (see Step 9).
                </p>

                <FieldGroup>
                  <Label htmlFor="supplier1" required>Supplier / quote 1</Label>
                  <Input id="supplier1" value={form.supplier1} onChange={set('supplier1')} required placeholder="Supplier name and quoted price" />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="supplier2">Supplier / quote 2 (optional)</Label>
                  <Input id="supplier2" value={form.supplier2} onChange={set('supplier2')} placeholder="Supplier name and quoted price" />
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor="supplier3">Supplier / quote 3 (optional)</Label>
                  <Input id="supplier3" value={form.supplier3} onChange={set('supplier3')} placeholder="Supplier name and quoted price" />
                </FieldGroup>

                <FieldGroup>
                  <Label htmlFor="procSelect" required>Is the proposed supplier on an approved procurement framework?</Label>
                  <Select id="procSelect" value={form.procSelect} onChange={set('procSelect')} required>
                    <option value="">-- Select --</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No — direct award / not on framework</option>
                    <option value="Don&apos;t Know">Don&apos;t Know</option>
                  </Select>
                </FieldGroup>
                {form.procSelect !== '' && (
                  <FieldGroup>
                    <Label htmlFor="procDetails">Framework / procurement details</Label>
                    <Textarea
                      id="procDetails"
                      value={form.procDetails}
                      onChange={set('procDetails')}
                      rows={3}
                      placeholder={
                        form.procSelect === 'Yes'
                          ? 'Framework name, lot, and reference number...'
                          : 'Explain why framework procurement is not applicable or possible...'
                      }
                    />
                  </FieldGroup>
                )}

                <FieldGroup>
                  <Label htmlFor="urnRequested">Has a URN been requested from NHS Supply Chain?</Label>
                  <Select id="urnRequested" value={form.urnRequested} onChange={set('urnRequested')}>
                    <option value="">-- Select --</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    If yes, NHS Supply Chain will be added to the recipients of the concluded email.
                  </p>
                </FieldGroup>
              </div>
            )}

            {/* ─────────────── STEP 9: FINANCIAL ───────────────────────── */}
            {step === 9 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldGroup>
                    <Label htmlFor="anticipatedLife" required>Anticipated equipment life</Label>
                    <Select id="anticipatedLife" value={form.anticipatedLife} onChange={set('anticipatedLife')} required>
                      <option value="">-- Select years --</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((y) => (
                        <option key={y} value={String(y)}>{y} year{y > 1 ? 's' : ''}</option>
                      ))}
                    </Select>
                  </FieldGroup>

                  <FieldGroup>
                    <Label htmlFor="capitalCostExVat" required>Capital cost ex VAT (£)</Label>
                    <Input id="capitalCostExVat" value={form.capitalCostExVat} onChange={set('capitalCostExVat')} required type="number" placeholder="e.g. 25000" />
                  </FieldGroup>

                  <FieldGroup>
                    <Label htmlFor="annualMaintCost">Annual maintenance cost ex VAT (£)</Label>
                    <Input id="annualMaintCost" value={form.annualMaintCost} onChange={set('annualMaintCost')} type="number" placeholder="e.g. 2500" />
                  </FieldGroup>

                  <FieldGroup>
                    <Label htmlFor="consumablesCost">Annual consumables cost ex VAT (£)</Label>
                    <Input id="consumablesCost" value={form.consumablesCost} onChange={set('consumablesCost')} type="number" placeholder="e.g. 1000" />
                  </FieldGroup>
                </div>

                {/* Auto-calculated total */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-5">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Total estimated project cost</p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                    <span>Capital cost:</span>
                    <span className="text-right font-medium">{formatGBP(capital)}</span>
                    <span>Maintenance ({years} yr{years !== 1 ? 's' : ''} × {formatGBP(parseFloat(form.annualMaintCost) || 0)} p.a.):</span>
                    <span className="text-right font-medium">{formatGBP(maint)}</span>
                    <span>Consumables ({years} yr{years !== 1 ? 's' : ''} × {formatGBP(parseFloat(form.consumablesCost) || 0)} p.a.):</span>
                    <span className="text-right font-medium">{formatGBP(cons)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-800">Total:</span>
                    <span className="text-lg font-bold text-gray-900">{formatGBP(totalEstimatedCost)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Ex VAT — total estimated project cost over equipment life.</p>
                </div>

                {/* Value flags */}
                {showBusinessCase && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-amber-900">Business case required</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Because the total estimated project cost exceeds {formatGBP(businessCaseThreshold)},
                      Executive Committee approval is required. This step will be added to the approval chain.
                    </p>
                  </div>
                )}

                {showSta && (
                  <div className="bg-orange-50 border border-orange-400 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-orange-900">Single Tender Action required</p>
                    <p className="text-sm text-orange-800 mt-1">
                      A direct award off-framework for equipment costing &ge; {formatGBP(staThreshold)} ex VAT
                      requires a Single Tender Action. You must also raise an SFI Waiver alongside this request.{' '}
                      <Link href="/waivers/new" className="underline font-medium text-orange-900 hover:text-orange-700">
                        Start SFI Waiver
                      </Link>
                    </p>
                  </div>
                )}

                {showProcThreshold && (
                  <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-red-900">Above procurement threshold</p>
                    <p className="text-sm text-red-800 mt-1">
                      The total estimated cost exceeds {formatGBP(mergProcThresholdExVat)} (ex-VAT proxy for the
                      PA23 procurement threshold). Formal PA23 procurement route applies; legal procurement rules are in effect.
                      Confirm with Procurement.
                    </p>
                  </div>
                )}

                {/* Approval chain preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Approval chain</p>
                  <p className="text-sm text-blue-800">{approvalChainLabel}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FieldGroup>
                    <Label htmlFor="awardRoute" required>Proposed award route</Label>
                    <Select id="awardRoute" value={form.awardRoute} onChange={set('awardRoute')} required>
                      <option value="">-- Select --</option>
                      <option value="framework">Framework agreement</option>
                      <option value="direct_award">Direct award (off-framework)</option>
                    </Select>
                  </FieldGroup>

                  <FieldGroup>
                    <Label htmlFor="fundingSource" required>Funding source</Label>
                    <Select id="fundingSource" value={form.fundingSource} onChange={set('fundingSource')} required>
                      <option value="">-- Select --</option>
                      <option value="MERG">MERG</option>
                      <option value="Charity">Charity</option>
                      <option value="NHSE">NHSE</option>
                      <option value="Capital Scheme Linked">Capital Scheme Linked</option>
                    </Select>
                  </FieldGroup>
                </div>

                {/* Charity-specific fields */}
                {form.fundingSource === 'Charity' && (
                  <div className="border-l-4 border-pink-300 pl-4 mb-5 space-y-4">
                    <p className="text-sm text-pink-800 font-medium">Charity funding details</p>
                    <FieldGroup>
                      <Label htmlFor="fundName">Fund name</Label>
                      <Input id="fundName" value={form.fundName} onChange={set('fundName')} placeholder="e.g. York Hospital Charity – Cardiology Fund" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="fundNo">Fund number</Label>
                      <Input id="fundNo" value={form.fundNo} onChange={set('fundNo')} placeholder="e.g. CHY-001" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="charityDate">Date of charity approval</Label>
                      <Input id="charityDate" value={form.charityDate} onChange={set('charityDate')} type="date" />
                    </FieldGroup>
                    <FieldGroup>
                      <Label htmlFor="charityNotes">Additional charity notes</Label>
                      <Textarea id="charityNotes" value={form.charityNotes} onChange={set('charityNotes')} rows={3} />
                    </FieldGroup>
                  </div>
                )}

                {/* Submit / Draft buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleSubmit('submit')}
                    disabled={submitting}
                    style={{ backgroundColor: '#005EB8' }}
                    className="text-white text-sm font-semibold px-5 py-2.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                  <button
                    onClick={() => handleSubmit('draft')}
                    disabled={submitting}
                    className="bg-gray-100 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                </div>
              </div>
            )}

            {/* ── Navigation buttons (all steps except 9) ── */}
            {step < 9 && (
              <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
                {step > 1 && (
                  <button
                    onClick={handleBack}
                    className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={handleNext}
                  style={{ backgroundColor: '#005EB8' }}
                  className="text-white text-sm font-medium px-5 py-2 rounded hover:opacity-90 transition-opacity ml-auto"
                >
                  {step === 1 ? 'Agree & Continue' : 'Next'}
                </button>
              </div>
            )}
            {step === 9 && step > 1 && (
              <div className="mt-4">
                <button
                  onClick={handleBack}
                  className="bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
