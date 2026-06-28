'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '../UserContext';

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [approvalCount, setApprovalCount] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/submissions')
      .then((r) => r.json())
      .then((data) => setRequestCount(Array.isArray(data) ? data.length : 0));

    fetch('/api/approvals')
      .then((r) => r.json())
      .then((data) => setApprovalCount(Array.isArray(data) ? data.length : 0));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome, {user.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* New waiver */}
        <Link
          href="/waivers/new"
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-[#005EB8] transition-all group"
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-white text-lg font-bold"
            style={{ backgroundColor: '#005EB8' }}
          >
            +
          </div>
          <h2 className="font-semibold text-lg text-gray-900 group-hover:text-[#005EB8]">
            New SFI Waiver
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Start a new Standing Financial Instructions waiver request
          </p>
        </Link>

        {/* My Requests */}
        <Link
          href="/my-requests"
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-[#005EB8] transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {requestCount !== null && (
              <span className="bg-gray-200 text-gray-700 text-sm font-semibold px-2.5 py-1 rounded-full">
                {requestCount}
              </span>
            )}
          </div>
          <h2 className="font-semibold text-lg text-gray-900 group-hover:text-[#005EB8]">
            My Requests
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            View and track your submitted waiver requests
          </p>
        </Link>

        {/* Approvals */}
        <Link
          href="/approvals"
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-[#005EB8] transition-all group"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            {approvalCount !== null && approvalCount > 0 && (
              <span className="bg-amber-500 text-white text-sm font-semibold px-2.5 py-1 rounded-full">
                {approvalCount}
              </span>
            )}
            {approvalCount === 0 && (
              <span className="bg-gray-200 text-gray-600 text-sm font-semibold px-2.5 py-1 rounded-full">
                0
              </span>
            )}
          </div>
          <h2 className="font-semibold text-lg text-gray-900 group-hover:text-[#005EB8]">
            Approvals Queue
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Submissions waiting for your decision
          </p>
        </Link>
      </div>
    </div>
  );
}
