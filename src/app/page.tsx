'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from './UserContext';

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}
