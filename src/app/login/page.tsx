'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '../UserContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  trust: string;
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
    ADMIN: 'Administrator',
  };
  return labels[role] ?? role;
}

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const router = useRouter();
  const { setUser, user } = useUser();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
      return;
    }
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, [user, router]);

  const handleLogin = async (userId: string) => {
    setLoggingIn(userId);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      const userData = await res.json();
      setUser(userData);
      router.push('/dashboard');
    } else {
      setLoggingIn(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Prototype warning banner */}
      <div className="bg-amber-100 border border-amber-400 text-amber-900 px-4 py-3 rounded mb-6" role="alert">
        <p className="font-semibold">Demo sign-in — not secure</p>
        <p className="text-sm mt-1">
          You choose a demo user below; there are no passwords and anyone can sign in as anyone.
          This is for demonstrating the workflow only. Real NHS sign-on (single sign-on with your
          NHS account) is planned for a later phase. Do not enter real NHS data.
        </p>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in</h1>
      <p className="text-gray-600 mb-6">Select a demo user to continue:</p>

      {loading ? (
        <p className="text-gray-500">Loading users...</p>
      ) : (
        <ul className="space-y-3" role="list" aria-label="Demo users">
          {users.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => handleLogin(u.id)}
                disabled={loggingIn !== null}
                className="w-full text-left bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-[#005EB8] hover:shadow-sm transition-all disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[#005EB8]"
                aria-label={`Log in as ${u.name}, ${roleLabel(u.role)}, ${u.trust}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-blue-100 text-[#005EB8] text-xs font-medium px-2 py-1 rounded">
                      {roleLabel(u.role)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{u.trust}</p>
                  </div>
                </div>
                {loggingIn === u.id && (
                  <p className="text-sm text-[#005EB8] mt-2">Signing in...</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
