'use client';
import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, RefreshCw, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface InboxKpiRow {
  id: string; date: string; customerType: string | null; status: string | null;
  result: string | null; agent: string | null;
}

export default function ManyChatContent() {
  const [data, setData] = useState<InboxKpiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/inbox-kpi');
      if (res.ok) setData(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by period
  const now = new Date();
  const filtered = data.filter(d => {
    if (period === 'all') return true;
    if (!d.date) return false;
    const diff = (now.getTime() - new Date(d.date).getTime()) / (1000 * 60 * 60 * 24);
    if (period === 'week') return diff <= 7;
    if (period === 'month') return diff <= 30;
    return true;
  });

  const totalConversations = filtered.length;
  const closedCount = filtered.filter(d => d.result === 'Chốt đơn' || d.result === 'Đã chốt' || d.status === 'Đã chốt').length;
  const closeRate = totalConversations > 0 ? ((closedCount / totalConversations) * 100).toFixed(1) : '0';

  // Group by customer type
  const byType: Record<string, number> = {};
  filtered.forEach(d => {
    const key = d.customerType || 'Khác';
    byType[key] = (byType[key] || 0) + 1;
  });
  const typeData = Object.entries(byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Group by agent
  const byAgent: Record<string, number> = {};
  filtered.forEach(d => {
    const key = d.agent || 'Không rõ';
    byAgent[key] = (byAgent[key] || 0) + 1;
  });
  const agentData = Object.entries(byAgent).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Group by date for trend
  const byDate: Record<string, number> = {};
  filtered.forEach(d => {
    if (d.date) { const key = d.date.substring(0, 10); byDate[key] = (byDate[key] || 0) + 1; }
  });
  const trendData = Object.entries(byDate).sort((a, b) => a[0].localeCompare(b[0])).slice(-14).map(([date, count]) => ({ date: date.substring(5), count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="text-indigo-600" size={28} /> ManyChat Report
          </h1>
          <p className="text-slate-500 text-sm mt-1">Báo cáo hiệu quả chatbot & inbox</p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm ${period === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {p === 'week' ? '7 ngày' : p === 'month' ? '30 ngày' : 'Tất cả'}
            </button>
          ))}
          <button onClick={fetchData} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700">
          <div className="flex items-center gap-2 mb-1"><MessageSquare size={16} /><p className="text-xs font-medium">Tổng hội thoại</p></div>
          <p className="text-2xl font-bold">{totalConversations}</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} /><p className="text-xs font-medium">Đã chốt đơn</p></div>
          <p className="text-2xl font-bold">{closedCount}</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} /><p className="text-xs font-medium">Tỉ lệ chốt</p></div>
          <p className="text-2xl font-bold">{closeRate}%</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
          <div className="flex items-center gap-2 mb-1"><Users size={16} /><p className="text-xs font-medium">Loại KH</p></div>
          <p className="text-2xl font-bold">{Object.keys(byType).length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Hội thoại theo loại KH</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Xu hướng hội thoại</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu</p>}
        </div>
      </div>

      {/* Agent Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-3 border-b"><h3 className="font-semibold">Hiệu suất theo Agent</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Agent</th>
                <th className="text-left px-4 py-3 font-semibold">Số hội thoại</th>
                <th className="text-left px-4 py-3 font-semibold">Tỉ trọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">Đang tải...</td></tr>
              ) : agentData.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400">Chưa có dữ liệu</td></tr>
              ) : agentData.map(a => (
                <tr key={a.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">{a.value}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[120px]">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalConversations > 0 ? (a.value / totalConversations * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{totalConversations > 0 ? ((a.value / totalConversations) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
