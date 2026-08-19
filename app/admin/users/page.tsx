'use client';

import { useState, useEffect } from 'react';
import { useAdminRoute } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/lib/store/auth';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  role: 'learner' | 'admin';
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const { isAdmin } = useAdminRoute();
  const { logout } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=20&q=${search}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleRoleChange = async (userId: string, newRole: 'learner' | 'admin') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to toggle active:', error);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <button
          onClick={() => logout()}
          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
        >
          退出登录
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索邮箱或昵称..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-md px-4 py-2 border rounded"
        />
      </div>

      {loading ? (
        <div>加载中...</div>
      ) : (
        <>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">邮箱</th>
                <th className="border px-4 py-2">昵称</th>
                <th className="border px-4 py-2">角色</th>
                <th className="border px-4 py-2">状态</th>
                <th className="border px-4 py-2">注册时间</th>
                <th className="border px-4 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{user.email}</td>
                  <td className="border px-4 py-2">{user.display_name || '-'}</td>
                  <td className="border px-4 py-2">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as 'learner' | 'admin')}
                      className="px-2 py-1 border rounded"
                    >
                      <option value="learner">学习者的</option>
                      <option value="admin">管理员</option>
                    </select>
                  </td>
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded ${
                        user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.is_active ? '激活' : '已禁用'}
                    </span>
                  </td>
                  <td className="border px-4 py-2">
                    {new Date(user.created_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => handleToggleActive(user.id, !user.is_active)}
                      className={`px-3 py-1 rounded ${
                        user.is_active
                          ? 'bg-gray-200 hover:bg-gray-300'
                          : 'bg-green-200 hover:bg-green-300'
                      }`}
                    >
                      {user.is_active ? '禁用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              上一页
            </button>
            <span className="px-4 py-2">
              第 {page} 页，共 {Math.ceil(total / 20)} 页
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}
