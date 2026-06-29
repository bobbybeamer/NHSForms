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
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_APPROVAL: 'bg-blue-100 text-blue-800',
  INFO_REQUESTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

function statusLabel(s: string) {
  return s.replace(/_/g, ' ');
}

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

function currentStageLabel(steps: ApprovalStep[]): string {
  const active = steps.find((s) => s.status === 'ACTIVE');
  if (active) return `Step ${active.sequence}: ${roleLabel(active.approverRole)}`;
  const infoReq = steps.find((s) => s.status === 'INFO_REQUESTED');
  if (infoReq) return `Info requested (${roleLabel(infoReq.approverRole)})`;
  return '—';
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

export default function MyRequestsPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetch('/api/submissions')
        .then((r) => r.json())
        .then((data) => {
          setSubmissions(Array.isArray(data) ? data : []);
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
        <span>My Requests</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/waivers/new"
            style={{ backgroundColor: '#005EB8' }}
            className="text-white text-sm font-medium px-3 py-2 rounded hover:opacity-90 transition-opacity"
          >
            + New Waiver
          </Link>
          <Link
            href="/merg/new"
            className="text-[#005EB8] border border-[#005EB8] text-sm font-medium px-3 py-2 rounded hover:bg-blue-50 transition-colors"
          >
            + New MERG
          </Link>
        </div>
      </div>

      {fetching ? (
        <p className="text-gray-500">Loading submissions...</p>
      ) : submissions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-gray-500 mb-4">You have no requests yet.</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/waivers/new"
              style={{ backgroundColor: '#005EB8' }}
              className="inline-block text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90"
            >
              Start an SFI Waiver
            </Link>
            <Link
              href="/merg/new"
              className="inline-block text-[#005EB8] border border-[#005EB8] text-sm font-medium px-4 py-2 rounded hover:bg-blue-50"
            >
              Start a MERG Request
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200" aria-label="My requests">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Reference</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden sm:table-cell">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden md:table-cell">Description</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wide">Value</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide hidden lg:table-cell">Current Stage</th>
                <th scope="col" className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((s) => {
                const fields = (() => {
                  try { return JSON.parse(s.fieldValues); } catch { return {}; }
                })();
                const ref = s.id.slice(-8).toUpperCase();
                const date = new Date(s.createdAt).toLocaleDateString('en-GB');
                const desc = descriptionForSubmission(s.formTypeKey, fields);
                const { label, badge } = formTypeLabel(s.formTypeKey);

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{ref}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 hidden md:table-cell max-w-xs truncate">{desc}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">{formatGBP(s.totalValueIncVat)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${STATUS_BADGE[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">
                      {currentStageLabel(s.approvalSteps)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/submissions/${s.id}`}
                        className="text-sm text-[#005EB8] hover:underline"
                      >
                        View
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
