'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth';
import { useProtectedRoute } from '@/lib/hooks/use-auth';

/**
 * User menu component
 * Shows user info and logout button when logged in, login/register links when not
 */
export function UserMenu() {
  const { userId, email, displayName, role, logout } = useAuthStore();
  useProtectedRoute(); // This is just for the redirect logic, we don't use the return value

  if (!userId) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/login"
          className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
        >
          登录
        </Link>
        <Link
          href="/register"
          className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      <span className="text-gray-700 text-sm">
        {displayName || email}
        {role === 'admin' && <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">管理员</span>}
      </span>
      {role === 'admin' && (
        <Link
          href="/admin/users"
          className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
        >
          管理后台
        </Link>
      )}
      <button
        onClick={() => logout()}
        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
      >
        退出
      </button>
    </div>
  );
}
