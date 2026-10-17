'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminAuditEvent {
  id: string;
  action: string;
  target: string;
  targetLabel: string;
  oldValue: string;
  newValue: string;
  createdAt: string;
  actor: { id: string; name: string };
}

interface Threshold {
  key: string;
  value: number;
  label: string;
  comment: string;
  updatedAt: string;
}

function formatGBP(v: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', minimumFractionDigits: 0,
  }).format(v);
}

function formatSetting(v: string) {
  const n = Number(v);
  return isNaN(n) ? v : formatGBP(n);
}

// Rendered only for ADMIN users — the server-side check is in page.tsx, and the
// APIs this calls enforce ADMIN independently.
export default function AdminPanel({ adminName }: { adminName: string }) {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEvent[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const loadAudit = () =>
    fetch('/api/admin/audit')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { setAuditEvents(Array.isArray(data) ? data : []); setAuditLoaded(true); })
      .catch(() => setAuditLoaded(true));

  useEffect(() => {
    fetch('/api/thresholds')
      .then((r) => r.json())
      .then((data) => { setThresholds(Array.isArray(data) ? data : []); setFetching(false); })
      .catch(() => setFetching(false));
    loadAudit();
  }, []);

  const startEdit = (t: Threshold) => {
    setEditing(t.key);
    setDraftValue(String(t.value));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const cancelEdit = () => { setEditing(null); setSaveError(null); };

  const handleSave = async (key: string) => {
    const parsed = parseFloat(draftValue);
    if (isNaN(parsed) || parsed <= 0) {
      setSaveError('Please enter a positive number.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/thresholds/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: parsed }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? 'Save failed.');
        setSaving(false);
        return;
      }
      const updated: Threshold = await res.json();
      setThresholds((prev) => prev.map((t) => (t.key === key ? updated : t)));
      loadAudit();
      setEditing(null);
      setSaveSuccess(`${updated.label} updated to ${formatGBP(updated.value)}.`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:underline text-[#005EB8]">Dashboard</Link>
        <span className="mx-2">/</span>
        <span>Admin — Configurable Thresholds</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurable Thresholds</h1>
        <p className="text-sm text-gray-500 mt-1">
          Changes take effect immediately for all new submissions. Existing submissions
          are not re-routed. Every change is recorded below. Logged in as administrator: <strong>{adminName}</strong>
        </p>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border border-green-400 rounded p-3 mb-4 text-sm text-green-900" role="status">
          ✓ {saveSuccess}
        </div>
      )}

      {fetching ? (
        <p className="text-gray-500">Loading thresholds…</p>
      ) : (
        <div className="space-y-4">
          {thresholds.map((t) => (
            <div key={t.key} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div>
                  <h2 className="font-semibold text-gray-900">{t.label}</h2>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">{t.key}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#005EB8]">{formatGBP(t.value)}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last updated {new Date(t.updatedAt).toLocaleString('en-GB')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{t.comment}</p>

              {editing === t.key ? (
                <div className="border-t border-gray-100 pt-4">
                  {saveError && (
                    <p className="text-sm text-red-700 mb-2" role="alert">{saveError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <label htmlFor={`val-${t.key}`} className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      New value (£)
                    </label>
                    <input
                      id={`val-${t.key}`}
                      type="number"
                      min="1"
                      step="1"
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                      aria-label={`New value for ${t.label}`}
                    />
                    <button
                      onClick={() => handleSave(t.key)}
                      disabled={saving}
                      style={{ backgroundColor: '#005EB8' }}
                      className="text-white text-sm font-medium px-4 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="text-sm text-gray-600 hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(t)}
                  className="text-sm text-[#005EB8] hover:underline"
                >
                  Edit value
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <section aria-labelledby="admin-audit-heading" className="mt-10">
        <h2 id="admin-audit-heading" className="text-lg font-bold text-gray-900 mb-1">Recent admin changes</h2>
        <p className="text-sm text-gray-600 mb-3">The 50 most recent changes to system settings, newest first.</p>
        {!auditLoaded ? (
          <p className="text-gray-500">Loading changes…</p>
        ) : auditEvents.length === 0 ? (
          <p className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl p-5">No admin changes recorded yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <caption className="sr-only">Recent admin changes: when, who, setting, old value and new value</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">When</th>
                  <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">Who</th>
                  <th scope="col" className="px-4 py-2 text-left font-semibold text-gray-700">Setting</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold text-gray-700">Old value</th>
                  <th scope="col" className="px-4 py-2 text-right font-semibold text-gray-700">New value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditEvents.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-gray-700">{new Date(e.createdAt).toLocaleString('en-GB')}</td>
                    <td className="px-4 py-2 text-gray-900">{e.actor?.name}</td>
                    <td className="px-4 py-2 text-gray-900">
                      {e.targetLabel}
                      <span className="block text-xs font-mono text-gray-600">{e.target}</span>
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap text-gray-700">{formatSetting(e.oldValue)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap font-semibold text-gray-900">{formatSetting(e.newValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
