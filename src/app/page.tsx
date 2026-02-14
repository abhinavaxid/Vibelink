'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();

  useEffect(() => {
    // Redirect based on auth status
    if (isAuthenticated) {
      // User is authenticated, go to lobby
      router.push('/lobby');
    } else {
      // Not authenticated, go to login
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return null;
}
