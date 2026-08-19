'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import { useAuthInit } from '@/lib/hooks/use-auth';

/**
 * Layout component for admin routes
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useAuthInit();
  const pathname = usePathname();

  // Only show admin nav on admin pages
  const isAdminPage = pathname?.startsWith('/admin');

  if (!isAdminPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">OpenMAIC 管理后台</span>
              <div className="ml-10 flex space-x-4">
                <a
                  href="/admin/stats"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  统计
                </a>
                <a
                  href="/admin/users"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  用户
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
