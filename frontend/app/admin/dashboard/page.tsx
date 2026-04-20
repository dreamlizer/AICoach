"use client";

import React, { useEffect, useState } from 'react';
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

type DashboardData = {
  summary?: {
    totalUsers: number;
    newUsersToday: number;
    activeToday: number;
    activeWeek: number;
    activeMonth: number;
  };
  userInfo?: Record<string, { email: string; name?: string }>;
  dailyStats: Array<{
    date: string;
    identifier: string;
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    message_count: number;
    word_count: number;
  }>;
  toolStats: Array<{
    date: string;
    identifier: string;
    tool_id: string;
    usage_count: number;
  }>;
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isUnauthorized = !authLoading && !loading && user?.role !== "admin";

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats-json", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "加载统计数据失败");
      }
      if (json?.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err: any) {
      console.error("Failed to load stats:", err);
      setError(err.message || "加载统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "admin") {
      setLoading(false);
      setError("你没有权限查看此页面");
      return;
    }
    void loadStats();
  }, [authLoading, user?.role]);

  // Helper to render user info
  const renderIdentifier = (identifier: string) => {
    if (data?.userInfo && data.userInfo[identifier]) {
      const u = data.userInfo[identifier];
      return (
        <div>
          <div className="text-white font-medium">{u.email}</div>
          <div className="text-xs text-gray-500">{u.name} (ID: {identifier})</div>
        </div>
      );
    }
    return identifier;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">系统统计面板</h1>
            <p className="text-gray-400 mt-2">查看用户活跃度、Token 使用量和工具调用情况。</p>
          </div>
          <div className="flex gap-4">
            <Link href="/admin/users" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              用户管理
            </Link>
            <Link href="/" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              返回首页
            </Link>
          </div>
        </div>

        {authLoading || loading ? (
          <div className="rounded-2xl border border-gray-800 bg-[#171717] p-8 text-gray-300">
            正在加载统计数据...
          </div>
        ) : isUnauthorized ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8">
            <h2 className="text-xl font-semibold text-amber-200">无权访问管理员面板</h2>
            <p className="mt-3 text-sm text-amber-100/80">
              当前账号不是管理员，因此不会继续请求后台统计数据。
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition-colors">
                返回首页
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
            <h2 className="text-xl font-semibold text-red-200">统计数据加载失败</h2>
            <p className="mt-3 text-sm text-red-100/80">{error}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => void loadStats()}
                className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm transition-colors"
              >
                重新加载
              </button>
              <Link href="/" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm transition-colors">
                返回首页
              </Link>
            </div>
          </div>
        ) : (
          <>
        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">总用户数</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.totalUsers}</div>
              <div className="text-xs text-gray-500 mt-1">已注册账号</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-green-400 text-sm font-medium uppercase tracking-wider">今日新增</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.newUsersToday}</div>
              <div className="text-xs text-gray-500 mt-1">新注册用户</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-blue-400 text-sm font-medium uppercase tracking-wider">今日活跃</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeToday}</div>
              <div className="text-xs text-gray-500 mt-1">独立用户 / IP</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-purple-400 text-sm font-medium uppercase tracking-wider">近 7 天活跃</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeWeek}</div>
              <div className="text-xs text-gray-500 mt-1">最近一周</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-pink-400 text-sm font-medium uppercase tracking-wider">近 30 天活跃</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeMonth}</div>
              <div className="text-xs text-gray-500 mt-1">最近一月</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#60A5FA] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#60A5FA] rounded-full"></span>
              每日 Token 与活跃统计
            </h2>
            <a 
              href="/api/admin/export-stats" 
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              导出完整报表（CSV）
            </a>
          </div>
          
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#252525] text-gray-200 font-medium">
                  <tr>
                    <th className="px-6 py-4">日期</th>
                    <th className="px-6 py-4">用户</th>
                    <th className="px-6 py-4 text-right">总 Tokens</th>
                    <th className="px-6 py-4 text-right">输入</th>
                    <th className="px-6 py-4 text-right">输出</th>
                    <th className="px-6 py-4 text-right">消息数</th>
                    <th className="px-6 py-4 text-right">字数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data?.dailyStats?.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-[#2A2A2A] transition-colors">
                      <td className="px-6 py-4 font-mono text-[#9CA3AF]">{row.date}</td>
                      <td className="px-6 py-4 font-mono text-[#9CA3AF]">
                        {renderIdentifier(row.identifier)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-white">{row.total_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-500">{row.input_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-[#34D399]">{row.output_tokens.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">{row.message_count}</td>
                      <td className="px-6 py-4 text-right">{row.word_count.toLocaleString()}</td>
                    </tr>
                  ))}
                  {(!data?.dailyStats || data.dailyStats.length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-600">暂时还没有统计数据，等用户开始使用后这里会自动出现。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#F472B6] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#F472B6] rounded-full"></span>
              工具使用频率
            </h2>
            <a 
              href="/api/admin/export-stats?type=tools" 
              className="flex items-center gap-2 px-4 py-2 bg-[#DB2777] hover:bg-[#BE185D] rounded-lg text-sm font-medium transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              导出工具报表（CSV）
            </a>
          </div>

          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#252525] text-gray-200 font-medium">
                  <tr>
                    <th className="px-6 py-4">日期</th>
                    <th className="px-6 py-4">用户 ID</th>
                    <th className="px-6 py-4">工具 ID</th>
                    <th className="px-6 py-4 text-right">使用次数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data?.toolStats?.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-[#2A2A2A] transition-colors">
                      <td className="px-6 py-4 font-mono text-[#9CA3AF]">{row.date}</td>
                      <td className="px-6 py-4 font-mono text-[#9CA3AF]">{row.identifier}</td>
                      <td className="px-6 py-4 font-medium text-[#F472B6]">{row.tool_id}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">{row.usage_count}</td>
                    </tr>
                  ))}
                   {(!data?.toolStats || data.toolStats.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-600">暂时还没有工具使用记录。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
