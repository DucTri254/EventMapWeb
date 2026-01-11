'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      const user = getUser();
      if (user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (user?.role === 'EVENT_CREATOR') {
        router.push('/creator');
      } else {
        router.push('/home');
      }
    } else {
      router.push('/home');
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
