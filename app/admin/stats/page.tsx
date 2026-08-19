'use client';

import { useState, useEffect } from 'react';
import { useAdminRoute } from '@/lib/hooks/use-auth';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

export default function AdminStatsPage() {
  const { isAdmin } = useAdminRoute();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">统计概览</h1>

      {loading ? (
        <div>加载中...</div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h2 className="text-lg font-semibold text-blue-800">总用户数</h2>
            <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
          </div>
          <div className="p-4 bg-green-50 rounded">
            <h2 className="text-lg font-semibold text-green-800">活跃用户</h2>
            <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded">
            <h2 className="text-lg font-semibold text-purple-800">管理员数量</h2>
            <p className="text-3xl font-bold text-purple-600">{stats.adminCount}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded">
            <h2 className="text-lg font-semibold text-yellow-800">今日新增</h2>
            <p className="text-3xl font-bold text-yellow-600">{stats.newUsersToday}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded col-span-2">
            <h2 className="text-lg font-semibold text-orange-800">本周新增</h2>
            <p className="text-3xl font-bold text-orange-600">{stats.newUsersThisWeek}</p>
          </div>
        </div>
      ) : (
        <div>暂无数据</div>
      )}
    </div>
  );
}
