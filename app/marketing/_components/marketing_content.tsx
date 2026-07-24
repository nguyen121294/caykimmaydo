'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, TrendingUp, Eye, MousePointerClick, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ABTest {
  id: string; testName: string; dateStarted: string | null; dateEnded: string | null;
  variantA: string | null; variantB: string | null;
  budgetA: number; budgetB: number;
  impressionsA: number; impressionsB: number;
  clicksA: number; clicksB: number;
  conversionsA: number; conversionsB: number;
  revenueA: number; revenueB: number;
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function MarketingContent() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ab-tests');
      if (res.ok) setTests(await res.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBudget = tests.reduce((s, t) => s + (t.budgetA || 0) + (t.budgetB || 0), 0);
  const totalRevenue = tests.reduce((s, t) => s + (t.revenueA || 0) + (t.revenueB || 0), 0);
  const totalImpressions = tests.reduce((s, t) => s + (t.impressionsA || 0) + (t.impressionsB || 0), 0);
  const totalClicks = tests.reduce((s, t) => s + (t.clicksA || 0) + (t.clicksB || 0), 0);
  const overallROAS = totalBudget > 0 ? (totalRevenue / totalBudget).toFixed(1) : '0';
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0';
  // Using shared formatMoney from lib/utils

  const chartData = tests.slice(0, 8).map(t => ({
    name: t.testName?.length > 15 ? t.testName.substring(0, 15) + '...' : t.testName,
    'Variant A': t.revenueA || 0,
    'Variant B': t.revenueB || 0,
  }));

  const budgetByTest = tests.slice(0, 6).map(t => ({
    name: t.testName?.length > 12 ? t.testName.substring(0, 12) + '...' : t.testName,
    value: (t.budgetA || 0) + (t.budgetB || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="text-indigo-600" size={28} /> Marketing Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Tổng quan hiệu quả quảng cáo & A/B test</p>
        </div>
        <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng ngân sách', value: fmt(totalBudget), icon: DollarSign, color: 'bg-red-50 text-red-700' },
          { label: 'Doanh thu Ads', value: fmt(totalRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'ROAS', value: overallROAS + 'x', icon: TrendingUp, color: 'bg-purple-50 text-purple-700' },
          { label: 'CTR trung bình', value: ctr + '%', icon: MousePointerClick, color: 'bg-blue-50 text-blue-700' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={16} />
              <p className="text-xs font-medium opacity-80">{k.label}</p>
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Doanh thu theo A/B Test</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="Variant A" fill="#6366f1" radius={[4,4,0,0]} />
                <Bar dataKey="Variant B" fill="#f59e0b" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Phân bổ ngân sách</h3>
          {budgetByTest.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={budgetByTest} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {budgetByTest.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu</p>}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-3 border-b"><h3 className="font-semibold">Chi tiết A/B Tests</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Tên test</th>
                <th className="text-left px-4 py-3 font-semibold">Ngân sách</th>
                <th className="text-left px-4 py-3 font-semibold">Impressions</th>
                <th className="text-left px-4 py-3 font-semibold">Clicks</th>
                <th className="text-left px-4 py-3 font-semibold">Conversions</th>
                <th className="text-left px-4 py-3 font-semibold">Doanh thu</th>
                <th className="text-left px-4 py-3 font-semibold">ROAS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Đang tải...</td></tr>
              ) : tests.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">Chưa có dữ liệu A/B test</td></tr>
              ) : tests.map(t => {
                const budget = (t.budgetA || 0) + (t.budgetB || 0);
                const revenue = (t.revenueA || 0) + (t.revenueB || 0);
                const roas = budget > 0 ? (revenue / budget).toFixed(1) : '—';
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{t.testName}</td>
                    <td className="px-4 py-3">{fmt(budget)}</td>
                    <td className="px-4 py-3">{((t.impressionsA || 0) + (t.impressionsB || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3">{((t.clicksA || 0) + (t.clicksB || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3">{((t.conversionsA || 0) + (t.conversionsB || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-emerald-600">{fmt(revenue)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${parseFloat(roas) >= 2 ? 'bg-emerald-100 text-emerald-700' : parseFloat(roas) >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{roas}x</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
