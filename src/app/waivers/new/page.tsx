'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../../UserContext';
import {
  JUSTIFICATION_REASONS,
  computeApprovalChain,
  waiverBandSettingsFromRows,
  type WaiverBandSettings,
} from '@/config/waiverRouting';

const TRUSTS = ['York & Scarborough', 'HUTH', 'NLAG'];

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    REQUESTER: 'Requester',
    PROCUREMENT_BP: 'Procurement BP',
    FINANCE: 'Finance',
    DIRECTOR_OF_PROCUREMENT: 'Director of Procurement',
    CFO: 'CFO',
    EXEC_COMMITTEE: 'Exec Committee',
    TRUST_BOARD: 'Trust Board',
  };
  return labels[role] ?? role;
}

function formatGBP(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(value);
}

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function NewWaiverPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    trust: '',
    department: '',
    division: '',
    sourceOfFunding: '',
    descriptionOfGoodsServices: '',
    purchaseValueExVat: '',
    vat: '',
    proposedSupplier: '',
    contractPeriod: '',
    conflictOfInterest: 'No',
    conflictDetails: '',
    justificationReason: '',
    waiverCircumstances: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // All band boundaries come from /api/thresholds (the database). Until they
  // load, no preview or threshold warning is shown — there is no default value.
  const [bandSettings, setBandSettings] = useState<WaiverBandSettings | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      setForm((prev) => ({ ...prev, trust: user.trust }));
    }
  }, [user, loading, router]);

  // Fetch live band settings from database — drive both the banner and approval chain preview.
  useEffect(() => {
    fetch('/api/thresholds')
      .then((r) => r.json())
      .then((rows: { key: string; value: number }[]) => {
        setBandSettings(waiverBandSettingsFromRows(Array.isArray(rows) ? rows : []));
      })
      .catch(() => { /* no preview until settings load */ });
  }, []);

  const purchaseNum = parseFloat(form.purchaseValueExVat) || 0;
  const vatNum = parseFloat(form.vat) || 0;
  const totalValueIncVat = purchaseNum + vatNum;

  const approvalChain = useMemo(
    () => (bandSettings ? computeApprovalChain(totalValueIncVat, bandSettings) : null),
    [totalValueIncVat, bandSettings]
  );
  const pa23Threshold = bandSettings?.pa23ThresholdIncVat ?? null;

  const wordCount = countWords(form.waiverCircumstances);
  const overThreshold = pa23Threshold !== null && totalValueIncVat >= pa23Threshold;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (action: 'draft' | 'submit') => {
    setError(null);
    setSubmitting(true);

    const fieldValues = {
      ...form,
      purchaseValueExVat: purchaseNum,
      vat: vatNum,
      totalValueIncVat,
      requesterName: user?.name ?? '',
      date: today,
    };

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formTypeKey: 'sfi_waiver',
          trust: form.trust,
          fieldValues,
          totalValueIncVat,
          action,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'An error occurred. Please try again.');
        setSubmitting(false);
        return;
      }

      const submission = await res.json();
      router.push(`/submissions/${submission.id}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return <div className="text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
        <a href="/dashboard" className="hover:underline text-[#005EB8]">Dashboard</a>
        <span className="mx-2">/</span>
        <span>New SFI Waiver</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">SFI Waiver Request</h1>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-4 mb-6" role="alert">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => e.preventDefault()}
        className="space-y-6 bg-white border border-gray-200 rounded-xl p-8"
        noValidate
      >
        {/* Section: Organisation */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Organisation details
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trust" className="block text-sm font-medium text-gray-700 mb-1">
                Trust <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="trust"
                name="trust"
                value={form.trust}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
              >
                <option value="">Select trust...</option>
                {TRUSTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="department"
                name="department"
                value={form.department}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="e.g. Radiology"
              />
            </div>

            <div>
              <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>
              <input
                type="text"
                id="division"
                name="division"
                value={form.division}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="e.g. Clinical Services"
              />
            </div>

            <div>
              <label htmlFor="sourceOfFunding" className="block text-sm font-medium text-gray-700 mb-1">
                Source of funding <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="sourceOfFunding"
                name="sourceOfFunding"
                value={form.sourceOfFunding}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="e.g. Revenue / Capital"
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Goods/Services */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Goods / Services
          </legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="descriptionOfGoodsServices" className="block text-sm font-medium text-gray-700 mb-1">
                Description of goods / services <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="descriptionOfGoodsServices"
                name="descriptionOfGoodsServices"
                value={form.descriptionOfGoodsServices}
                onChange={handleChange}
                required
                rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="Describe the goods or services to be procured"
              />
            </div>

            <div>
              <label htmlFor="proposedSupplier" className="block text-sm font-medium text-gray-700 mb-1">
                Proposed supplier <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="proposedSupplier"
                name="proposedSupplier"
                value={form.proposedSupplier}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
              />
            </div>

            <div>
              <label htmlFor="contractPeriod" className="block text-sm font-medium text-gray-700 mb-1">
                Contract period <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="contractPeriod"
                name="contractPeriod"
                value={form.contractPeriod}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="e.g. 12 months"
              />
            </div>
          </div>
        </fieldset>

        {/* Section: Value */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Financial value
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="purchaseValueExVat" className="block text-sm font-medium text-gray-700 mb-1">
                Purchase value ex VAT (£) <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                type="number"
                id="purchaseValueExVat"
                name="purchaseValueExVat"
                value={form.purchaseValueExVat}
                onChange={handleChange}
                required
                min={0}
                step="0.01"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="vat" className="block text-sm font-medium text-gray-700 mb-1">
                VAT (£)
              </label>
              <input
                type="number"
                id="vat"
                name="vat"
                value={form.vat}
                onChange={handleChange}
                min={0}
                step="0.01"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                placeholder="0.00"
              />
            </div>

            <div>
              <label htmlFor="totalValueIncVat" className="block text-sm font-medium text-gray-700 mb-1">
                Total value inc VAT (£) <span className="text-gray-400 font-normal">(auto)</span>
              </label>
              <input
                type="text"
                id="totalValueIncVat"
                value={totalValueIncVat > 0 ? totalValueIncVat.toFixed(2) : ''}
                readOnly
                aria-readonly="true"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-700 font-medium"
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          {/* PA23 threshold warning */}
          {overThreshold && (
            <div
              className="mt-4 bg-orange-50 border border-orange-400 text-orange-900 rounded p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="font-semibold">Above the procurement threshold</p>
              <p className="text-sm mt-1">
                This value ({formatGBP(totalValueIncVat)}) is at or above the PA23 threshold ({formatGBP(pa23Threshold ?? 0)}).
                A direct-award waiver requires a PA23 transparency notice and a mandatory standstill period.
                Confirm with Procurement before proceeding.
              </p>
            </div>
          )}
        </fieldset>

        {/* Section: Conflict of Interest */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Conflict of interest
          </legend>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Do you have a conflict of interest with this supplier?
              <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            </p>
            <div className="flex gap-6" role="radiogroup" aria-label="Conflict of interest">
              {['No', 'Yes'].map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="conflictOfInterest"
                    value={opt}
                    checked={form.conflictOfInterest === opt}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#005EB8]"
                  />
                  <span className="text-sm text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
            {form.conflictOfInterest === 'Yes' && (
              <div className="mt-3">
                <label htmlFor="conflictDetails" className="block text-sm font-medium text-gray-700 mb-1">
                  Please provide details <span className="text-red-500" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="conflictDetails"
                  name="conflictDetails"
                  value={form.conflictDetails}
                  onChange={handleChange}
                  required
                  rows={2}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                />
              </div>
            )}
          </div>
        </fieldset>

        {/* Section: Justification */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Justification
          </legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="justificationReason" className="block text-sm font-medium text-gray-700 mb-1">
                Justification reason <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <select
                id="justificationReason"
                name="justificationReason"
                value={form.justificationReason}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
              >
                <option value="">Select reason...</option>
                {JUSTIFICATION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="waiverCircumstances" className="block text-sm font-medium text-gray-700 mb-1">
                How this waiver meets the stated circumstances{' '}
                <span className="text-gray-400 font-normal">(max 50 words)</span>
                <span className="text-red-500 ml-1" aria-hidden="true">*</span>
              </label>
              <textarea
                id="waiverCircumstances"
                name="waiverCircumstances"
                value={form.waiverCircumstances}
                onChange={handleChange}
                required
                rows={4}
                className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005EB8] ${
                  wordCount > 50 ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="Explain how this procurement meets the justification reason chosen above"
              />
              <p className={`text-xs mt-1 ${wordCount > 50 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {wordCount} / 50 words
              </p>
            </div>
          </div>
        </fieldset>

        {/* Section: Requester */}
        <fieldset>
          <legend className="text-base font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4 w-full">
            Requester
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="requesterName" className="block text-sm font-medium text-gray-700 mb-1">
                Requester name
              </label>
              <input
                type="text"
                id="requesterName"
                value={user.name}
                readOnly
                aria-readonly="true"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="text"
                id="date"
                value={new Date(today).toLocaleDateString('en-GB')}
                readOnly
                aria-readonly="true"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 text-gray-600"
              />
            </div>
          </div>
        </fieldset>

        {/* Approval chain preview */}
        {totalValueIncVat > 0 && approvalChain && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm font-semibold text-[#005EB8] mb-1">Approval chain preview</p>
            <p className="text-sm text-gray-700">
              This waiver ({formatGBP(totalValueIncVat)}) will require approval from:{' '}
              <strong>{approvalChain.map((r) => roleLabel(r)).join(' → ')}</strong>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2.5 px-4 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('submit')}
            disabled={submitting || wordCount > 50}
            style={{ backgroundColor: '#005EB8' }}
            className="flex-1 text-white font-medium py-2.5 px-4 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Submit for approval
          </button>
        </div>
      </form>
    </div>
  );
}
