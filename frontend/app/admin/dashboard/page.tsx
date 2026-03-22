"use client";

import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [data, setData] = useState<{ summary?: any, userInfo?: Record<string, any>, dailyStats: any[], toolStats: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats-json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load stats:", err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-white">Loading Stats...</div>;

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
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">System Analytics Dashboard</h1>
            <p className="text-gray-400 mt-2">Real-time monitoring of token usage and user activity.</p>
          </div>
          <div className="flex gap-4">
            <a href="/admin/users" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              User Management
            </a>
            <a href="/" className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
              Back to Chat
            </a>
          </div>
        </div>

        {/* Section 0: Summary Cards */}
        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Users</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.totalUsers}</div>
              <div className="text-xs text-gray-500 mt-1">Registered Accounts</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-green-400 text-sm font-medium uppercase tracking-wider">New Today</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.newUsersToday}</div>
              <div className="text-xs text-gray-500 mt-1">Registrations</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-blue-400 text-sm font-medium uppercase tracking-wider">Active Today</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeToday}</div>
              <div className="text-xs text-gray-500 mt-1">Unique Users/IPs</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-purple-400 text-sm font-medium uppercase tracking-wider">Active Week</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeWeek}</div>
              <div className="text-xs text-gray-500 mt-1">Last 7 Days</div>
            </div>
            <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-800 shadow-lg">
              <div className="text-pink-400 text-sm font-medium uppercase tracking-wider">Active Month</div>
              <div className="text-3xl font-bold text-white mt-2">{data.summary.activeMonth}</div>
              <div className="text-xs text-gray-500 mt-1">Last 30 Days</div>
            </div>
          </div>
        )}

        {/* Section 1: Daily Usage Stats */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#60A5FA] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#60A5FA] rounded-full"></span>
              Daily Token & Activity Stats
            </h2>
            <a 
              href="/api/admin/export-stats" 
              className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download Full Report (.csv)
            </a>
          </div>
          
          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#252525] text-gray-200 font-medium">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4 text-right">Total Tokens</th>
                    <th className="px-6 py-4 text-right">Input</th>
                    <th className="px-6 py-4 text-right">Output</th>
                    <th className="px-6 py-4 text-right">Messages</th>
                    <th className="px-6 py-4 text-right">Words</th>
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
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-600">No data available yet. Start chatting to generate stats.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 2: Tool Usage Stats */}
        <div className="space-y-4 pt-8 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#F472B6] flex items-center gap-2">
              <span className="w-2 h-2 bg-[#F472B6] rounded-full"></span>
              Tool Usage Frequency
            </h2>
            <a 
              href="/api/admin/export-stats?type=tools" 
              className="flex items-center gap-2 px-4 py-2 bg-[#DB2777] hover:bg-[#BE185D] rounded-lg text-sm font-medium transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download Tool Report (.csv)
            </a>
          </div>

          <div className="bg-[#1E1E1E] rounded-xl border border-gray-800 overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-[#252525] text-gray-200 font-medium">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">User ID</th>
                    <th className="px-6 py-4">Tool ID</th>
                    <th className="px-6 py-4 text-right">Usage Count</th>
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
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-600">No tool usage recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
