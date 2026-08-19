'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { mergeLearnerKeys } from '@/lib/auth/learner-merge';

/**
 * Auth initialization effect
 *
 * On mount, fetches current user session and triggers learner key merge if needed.
 * This should be used in the root layout or app component.
 */
export function useAuthInit() {
  const router = useRouter();
  const { fetchMe, userId, isLoading } = useAuthStore();

  useEffect(() => {
    // Fetch current session on mount
    fetchMe().then((_) => {
      // After fetching, check if we need to merge learner keys
      if (userId) {
        mergeLearnerKeys().catch(console.error);
      }
    });
  }, []); // Only run on mount

  return { isLoading };
}

/**
 * Protected route wrapper
 *
 * Redirects to login if user is not authenticated
 */
export function useProtectedRoute(redirectUrl: string = '/login') {
  const { userId, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !userId) {
      router.push(redirectUrl);
    }
  }, [userId, isLoading, redirectUrl, router]);

  return { isLoading, isAuthenticated: !!userId };
}

/**
 * Admin route wrapper
 *
 * Redirects to home if user is not an admin
 */
export function useAdminRoute(redirectUrl: string = '/') {
  const { userId, role, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!userId) {
        router.push('/login');
      } else if (role !== 'admin') {
        router.push(redirectUrl);
      }
    }
  }, [userId, role, isLoading, redirectUrl, router]);

  return { isLoading, isAdmin: role === 'admin' };
}
