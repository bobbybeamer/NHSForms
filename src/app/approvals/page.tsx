'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../UserContext';

interface ApprovalStep {
  id: string;
  sequence: number;
  approverRole: string;
  status: string;
}

interface Submission {
  id: string;
  formTypeKey: string;
  trust: string;
  status: string;
  totalValueIncVat: number;
  fieldValues: string;
  createdAt: string;
  approvalSteps: ApprovalStep[];
  requester: { id: string; name: string };
}

interface ApprovalItem {
  step: ApprovalStep;
  submission: Submission;
}

function formatGBP(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(value);
}

function formTypeLabel(key: string): { label: string; badge: string } {
  if (key === 'merg_equipment') return { label: 'MERG', badge: 'bg-purple-100 text-purple-800' };
  return { label: 'WAIVER', badge: 'bg-blue-100 text-blue-800' };
}

function descriptionForSubmission(formTypeKey: string, fields: Record<string, unknown>): string {
  if (formTypeKey === 'merg_equipment') {
    return (fields.desc as string) ?? (fields.model as string) ?? '—';
  }
  return (fields.descriptionOfGoodsServices as string) ?? '—';
}

export default function ApprovalsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetch('/api/approvals')
        .then((r) => r.json())
        .then((data) => {
          setItems(Array.isArray(data) ? data : []);
          setFetching(false);
        })
        .catch(() => setFetching(false));
    }
  }, [user, loading, router]);

  if (loading || !user) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:underline text-[#005EB8]">Dashboard</Link>
        <span className="mx-2">/</span>
        <span>Approvals Queue</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
        {items.length > 0 && (
          <span className="bg-amber-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
            {items.length} waiting
          </span>
        )}
      </div>

      {fetching ? (
        <p className="text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500">No submissions are currently waiting for your approval.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200" aria-label="Approvals waiting">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reference</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Trust</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Requester</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Description</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Value</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Submitted</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(({ step, submission }) => {
                const fields = (() => {
                  try { return JSON.parse(submission.fieldValues); } catch { return {}; }
                })();
                const ref = submission.id.slice(-8).toUpperCase();
                const date = new Date(submission.createdAt).toLocaleDateString('en-GB');
                const desc = descriptionForSubmission(submission.formTypeKey, fields);
                const { label, badge } = formTypeLabel(submission.formTypeKey);

                return (
                  <tr key={step.id} className="hover:bg-amber-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{ref}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{submission.trust}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{submission.requester?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell max-w-xs truncate">{desc}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap font-medium">{formatGBP(submission.totalValueIncVat)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap hidden lg:table-cell">{date}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${submission.id}`}
                        style={{ backgroundColor: '#005EB8' }}
                        className="text-white text-sm font-medium px-3 py-1.5 rounded hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
