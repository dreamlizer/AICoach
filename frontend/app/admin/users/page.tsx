"use client";

import React, { useEffect, useState } from "react";

type AdminUser = {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
  role?: string;
  hasPassword: boolean;
  conversationsCount: number;
  assessmentsCount: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load users");
      }
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleClearPassword = async (user: AdminUser) => {
    if (!window.confirm(`确认清除用户 ${user.email} 的密码吗？`)) return;
    setActionUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_password" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "操作失败");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`确认删除用户 ${user.email} 吗？将同步删除其对话和评测记录。`)) return;
    setActionUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "删除失败");
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">用户管理</h1>
            <p className="text-gray-400 mt-2">查看用户列表并执行常见账户操作。</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadUsers}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
            >
              刷新
            </button>
            <a href="/admin/dashboard" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              返回仪表盘
            </a>
            <a href="/" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              返回聊天
            </a>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 text-red-300 border border-red-500/30">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-300">加载中...</div>
        ) : (
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#252525] text-gray-200 font-medium">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">邮箱</th>
                    <th className="px-6 py-4">昵称</th>
                    <th className="px-6 py-4">角色</th>
                    <th className="px-6 py-4">密码</th>
                    <th className="px-6 py-4 text-right">对话</th>
                    <th className="px-6 py-4 text-right">评测</th>
                    <th className="px-6 py-4">创建时间</th>
                    <th className="px-6 py-4">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#2A2A2A] transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400">{user.id}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">{user.name || "-"}</td>
                      <td className="px-6 py-4">{user.role || "user"}</td>
                      <td className="px-6 py-4">
                        {user.hasPassword ? (
                          <span className="text-green-400">已设置</span>
                        ) : (
                          <span className="text-gray-500">未设置</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">{user.conversationsCount}</td>
                      <td className="px-6 py-4 text-right">{user.assessmentsCount}</td>
                      <td className="px-6 py-4 font-mono text-gray-400">{user.created_at}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleClearPassword(user)}
                            disabled={!user.hasPassword || actionUserId === user.id}
                            className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            清除密码
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={actionUserId === user.id}
                            className="px-3 py-1.5 rounded-md bg-red-600/80 hover:bg-red-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            删除用户
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td className="px-6 py-6 text-gray-500" colSpan={9}>
                        当前没有用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
