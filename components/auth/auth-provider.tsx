'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth';
import { useAuthInit } from '@/lib/hooks/use-auth';

/**
 * Auth provider component
 * Initializes auth state on mount
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuthStore();

  useAuthInit();

  useEffect(() => {
    fetchMe();
  }, []);

  return <>{children}</>;
}
