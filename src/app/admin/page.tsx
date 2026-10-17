import Link from 'next/link';
import { cookies } from 'next/headers';
import { getUserById, isAdmin } from '@/lib/adminAuth';
import AdminPanel from './AdminPanel';

// Server-side gate: the admin UI is only rendered for ADMIN users. Everyone
// else gets a "not authorised" page — the admin controls are never sent to them.
// The admin APIs enforce ADMIN independently (403), so this is not the only line.
export default async function AdminPage() {
  const cookieStore = await cookies();
  const user = await getUserById(cookieStore.get('nhs_user_id')?.value);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Please log in</h1>
        <p className="text-sm text-gray-700 mb-4">You need to log in to use this system.</p>
        <Link href="/login" className="text-[#005EB8] font-medium underline">Go to login</Link>
      </div>
    );
  }

  if (!isAdmin(user)) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-red-300 rounded-xl p-6" role="alert">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not authorised</h1>
        <p className="text-sm text-gray-700 mb-4">
          The admin area is restricted to administrators. You are logged in as{' '}
          <strong>{user.name}</strong>, who is not an administrator.
        </p>
        <Link href="/dashboard" className="text-[#005EB8] font-medium underline">Back to dashboard</Link>
      </div>
    );
  }

  return <AdminPanel adminName={user.name} />;
}
