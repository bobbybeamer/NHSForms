'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '../UserContext';

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

export default function AdminPage() {
  const { user, loading } = useUser();
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/thresholds')
      .then((r) => r.json())
      .then((data) => { setThresholds(Array.isArray(data) ? data : []); setFetching(false); })
      .catch(() => setFetching(false));
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
      setEditing(null);
      setSaveSuccess(`${updated.label} updated to ${formatGBP(updated.value)}.`);
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch {
      setSaveError('Network error — please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;

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
          are not re-routed. Logged in as: <strong>{user?.name ?? '—'}</strong>
        </p>
      </div>

      {/* Prototype warning */}
      <div className="bg-amber-50 border border-amber-400 rounded p-3 mb-6 text-sm text-amber-900">
        <strong>Prototype — no access control on this screen.</strong> In production,
        restrict to nominated admin users only.
        {/* TODO: replace with NHS SSO role-based access control */}
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
    </div>
  );
}
