'use client';

import Link from 'next/link';
import { useUser } from './UserContext';

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
    ADMIN: 'Administrator',
  };
  return labels[role] ?? role;
}

export default function Header() {
  const { user, loading, logout } = useUser();

  return (
    <header style={{ backgroundColor: '#005EB8' }} className="text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/login'} className="flex items-center gap-3 hover:opacity-90">
          {/* NHS logo block */}
          <div className="bg-white text-[#005EB8] font-black text-sm px-2 py-1 rounded select-none">
            NHS
          </div>
          <span className="font-semibold text-lg tracking-tight">
            Procurement Forms
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!loading && user ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-blue-200">{roleLabel(user.role)} &middot; {user.trust}</p>
              </div>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="text-blue-200 text-sm hover:text-white hidden sm:block"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                className="bg-white text-[#005EB8] text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
              >
                Log out
              </button>
            </>
          ) : !loading ? (
            <Link
              href="/login"
              className="bg-white text-[#005EB8] text-sm font-medium px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
