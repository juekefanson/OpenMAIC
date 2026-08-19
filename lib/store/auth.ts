/**
 * Auth Store
 *
 * Manages user authentication state: login, logout, token management.
 * Persists token and user info to KVStore 'account' scope for cross-device sync.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createKVPersistStorage, purgeLegacyPersistKey } from '@/lib/store/kv-persist';

export type UserRole = 'learner' | 'admin';

export interface AuthState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  token: string | null;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setDisplayName: (name: string) => void;
}

// Reference for recovery hook
const recovery: { rehydrate?: () => void | Promise<void> } = {};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      userId: null,
      email: null,
      displayName: null,
      role: null,
      token: null,
      isLoading: false,

      // Login
      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            credentials: 'include',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || '登录失败');
          }

          set({
            userId: data.userId,
            email: data.email,
            displayName: data.displayName,
            role: data.role as UserRole,
            token: data.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Register
      register: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName }),
            credentials: 'include',
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error?.message || '注册失败');
          }

          set({
            userId: data.userId,
            email: data.email,
            displayName: data.displayName,
            role: data.role as UserRole,
            token: data.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } finally {
          set({
            userId: null,
            email: null,
            displayName: null,
            role: null,
            token: null,
          });
        }
      },

      // Fetch current user
      fetchMe: async () => {
        set({ isLoading: true });
        try {
          const response = await fetch('/api/auth/me', {
            credentials: 'include',
          });

          if (!response.ok) {
            // Not authenticated - clear state
            set({
              userId: null,
              email: null,
              displayName: null,
              role: null,
              token: null,
              isLoading: false,
            });
            return;
          }

          const data = await response.json();
          set({
            userId: data.userId,
            email: data.email,
            role: data.role as UserRole,
            displayName: data.displayName || null,
            isLoading: false,
          });
        } catch {
          set({
            userId: null,
            email: null,
            displayName: null,
            role: null,
            token: null,
            isLoading: false,
          });
        }
      },

      // Set display name
      setDisplayName: (name: string) => {
        set({ displayName: name });
      },
    }),
    {
      name: 'auth-storage',
      storage: createKVPersistStorage<AuthState>('account', {
        onWriteRefused: () => recovery.rehydrate?.(),
      }),
      // Only persist non-sensitive fields
      partialize: (state) => ({
        userId: state.userId,
        email: state.email,
        displayName: state.displayName,
        role: state.role,
        // Note: token is NOT persisted here for security
        // It's managed via httpOnly cookies
      }),
    }
  )
);

// Bound after store creation for recovery hook
recovery.rehydrate = () => useAuthStore.persist.rehydrate();

// Purge legacy localStorage key
purgeLegacyPersistKey('auth-storage');

// Helper to get auth header for API calls
export function getAuthHeader(): { Authorization: string } | {} {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}
