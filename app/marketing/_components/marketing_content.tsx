'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Megaphone, RefreshCw, TrendingUp, MousePointerClick, DollarSign, Users, Info, Play, UserPlus, Target, PieChart as PieIcon, MapPin, Users2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ABTest {
  id: string; testName: string; dateStarted: string | null; dateEnded: string | null;
  variantA: string | null; variantB: string | null;
  budgetA: number; budgetB: number;
  impressionsA: number; impressionsB: number;
  clicksA: number; clicksB: number;
  conversionsA: number; conversionsB: number;
  revenueA: number; revenueB: number;
}

interface DemographicsData {
  isLive: boolean;
  profileActivity: {
    profileVisits: number;
    newFollowers: number;
  };
  goalMetrics: {
    profileVisitsGoal: number;
    firstPlays: number;
    costPerPurchase: string | null;
  };
  adDetails: {
    status: string;
    spend: number;
    totalBudget: number;
    duration: string;
    targetAudience: string;
  };
  topLocations: { name: string; percentage: number }[];
  genderBreakdown: { name: string; percentage: number }[];
  ageBreakdown: { range: string; percentage: number }[];
}

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

export default function MarketingContent() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [demographics, setDemographics] = useState<DemographicsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoTab, setDemoTab] = useState<'location' | 'gender' | 'age'>('location');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const t = Date.now();
      const [resTests, resDemo] = await Promise.all([
        fetch(`/api/ab-tests?_t=${t}`, { cache: 'no-store' }),
        fetch(`/api/marketing/demographics?_t=${t}`, { cache: 'no-store' }),
      ]);
      if (resTests.ok) setTests(await resTests.json());
      if (resDemo.ok) setDemographics(await resDemo.json());
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBudget = tests.reduce((s, t) => s + (t.budgetA || 0) + (t.budgetB || 0), 0);
  const totalRevenue = tests.reduce((s, t) => s + (t.revenueA || 0) + (t.revenueB || 0), 0);
  const totalImpressions = tests.reduce((s, t) => s + (t.impressionsA || 0) + (t.impressionsB || 0), 0);
  const totalClicks = tests.reduce((s, t) => s + (t.clicksA || 0) + (t.clicksB || 0), 0);
  const overallROAS = totalBudget > 0 ? (totalRevenue / totalBudget).toFixed(1) : '0';
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0';

  const chartData = tests.slice(0, 8).map(t => ({
    name: t.testName?.length > 15 ? t.testName.substring(0, 15) + '...' : t.testName,
    'Variant A': t.revenueA || 0,
    'Variant B': t.revenueB || 0,
  }));

  const budgetByTest = tests.slice(0, 6).map(t => ({
    name: t.testName?.length > 12 ? t.testName.substring(0, 12) + '...' : t.testName,
    value: (t.budgetA || 0) + (t.budgetB || 0),
  }));

  const adSpend = demographics?.adDetails?.spend ?? 46675;
  const adTotalBudget = demographics?.adDetails?.totalBudget ?? 160000;
  const spendPercent = adTotalBudget > 0 ? Math.min(Math.round((adSpend / adTotalBudget) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="text-indigo-600" size={28} /> Marketing Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Tổng quan hiệu quả quảng cáo Meta, Instagram Insights & Nhân khẩu học</p>
        </div>
        <button onClick={fetchData} className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium flex items-center gap-2 transition">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng ngân sách', value: fmt(totalBudget), icon: DollarSign, color: 'bg-red-50 text-red-700 border-red-100' },
          { label: 'Doanh thu Ads', value: fmt(totalRevenue), icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
          { label: 'ROAS', value: overallROAS + 'x', icon: TrendingUp, color: 'bg-purple-50 text-purple-700 border-purple-100' },
          { label: 'CTR trung bình', value: ctr + '%', icon: MousePointerClick, color: 'bg-blue-50 text-blue-700 border-blue-100' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border ${k.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <k.icon size={16} />
              <p className="text-xs font-medium opacity-80">{k.label}</p>
            </div>
            <p className="text-2xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      {/* META AD / BOOSTED POST INSIGHTS SECTION (MATCHING SCREENSHOT) */}
      <div className="bg-slate-950 text-slate-100 rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Chỉ số Quảng cáo & Bài đăng Instagram</h2>
              {demographics?.isLive ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live Meta API</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Demo Insights</span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-0.5">Dữ liệu chi tiết từ Meta Graph API & Boosted Post Insights</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1: Hoạt động trên trang cá nhân & Mục tiêu */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                  Hoạt động trên trang cá nhân <Info size={14} className="text-slate-400" />
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Lượt truy cập trang cá nhân</span>
                  <span className="font-bold text-white">{demographics?.profileActivity?.profileVisits ?? 35}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">Lượt theo dõi</span>
                  <span className="font-bold text-white">{demographics?.profileActivity?.newFollowers ?? 3}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                  Mục tiêu <Info size={14} className="text-slate-400" />
                </h3>
              </div>
              <div className="text-center py-2">
                <p className="text-3xl font-black text-white">{demographics?.goalMetrics?.profileVisitsGoal ?? 0}</p>
                <p className="text-xs text-slate-400 mt-0.5">Lượt truy cập trang cá nhân</p>
              </div>
              <div className="space-y-2 text-sm pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Lượt phát đầu tiên</span>
                  <span className="font-semibold text-white">{demographics?.goalMetrics?.firstPlays ?? 467}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Chi phí trên mỗi lượt mua</span>
                  <span className="text-slate-400">{demographics?.goalMetrics?.costPerPurchase ?? '--'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Chi tiết ngân sách & Trạng thái */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                  Chi tiết <Info size={14} className="text-slate-400" />
                </h3>
              </div>
              <div className="space-y-3.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trạng thái</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {demographics?.adDetails?.status ?? 'Còn 3 ngày'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400">Chi tiêu</span>
                    <span className="font-bold text-white">
                      {fmt(adSpend)} <span className="text-slate-400 font-normal">/ {fmt(adTotalBudget)}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${spendPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">Khoảng thời gian</span>
                  <span className="font-medium text-slate-200">{demographics?.adDetails?.duration ?? '4 ngày'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Đối tượng</span>
                  <span className="font-medium text-slate-200">{demographics?.adDetails?.targetAudience ?? 'Tiềm năng 2 (Thoa)'}</span>
                </div>
              </div>
            </div>

            <div className="bg-purple-950/40 rounded-lg p-3 border border-purple-800/40 text-xs text-purple-200">
              💡 Quảng cáo đang phân bổ hiệu quả tại thị trường TP. Hồ Chí Minh với nhóm khách hàng tiềm năng.
            </div>
          </div>

          {/* Card 3: Những người đã xem quảng cáo của bạn (Demographics Breakdown) */}
          <div className="bg-slate-900/80 rounded-xl p-5 border border-slate-800 space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-white mb-1">Những người đã xem quảng cáo của bạn</h3>
              <p className="text-slate-400 text-xs mb-3">Phân bổ nhân khẩu học khán giả tiếp cận</p>

              {!demographics?.isLive && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3 text-[11px] text-amber-300 flex items-center gap-1.5">
                  <Info size={13} className="shrink-0" />
                  Dữ liệu mẫu — Kết nối Facebook Ads ở trang <a href="/connections" className="underline font-medium hover:text-amber-200">Kết Nối</a> để xem data thật.
                </div>
              )}

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg text-xs mb-4">
                <button
                  onClick={() => setDemoTab('location')}
                  className={`py-1.5 rounded-md font-medium transition ${demoTab === 'location' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Vị trí hàng đầu
                </button>
                <button
                  onClick={() => setDemoTab('gender')}
                  className={`py-1.5 rounded-md font-medium transition ${demoTab === 'gender' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Giới tính
                </button>
                <button
                  onClick={() => setDemoTab('age')}
                  className={`py-1.5 rounded-md font-medium transition ${demoTab === 'age' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Độ tuổi
                </button>
              </div>

              {/* Location tab */}
              {demoTab === 'location' && (
                <div className="space-y-3">
                  {(demographics?.topLocations ?? [
                    { name: 'Ho Chi Minh City', percentage: 59.5 },
                    { name: 'Hanoi', percentage: 28.2 },
                    { name: 'Da Nang', percentage: 7.3 },
                    { name: 'Can Tho', percentage: 5.0 },
                  ]).map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.name}</span>
                        <span className="text-pink-400 font-bold">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Gender tab */}
              {demoTab === 'gender' && (
                <div className="space-y-3 py-2">
                  {(demographics?.genderBreakdown ?? [
                    { name: 'Nữ', percentage: 68.4 },
                    { name: 'Nam', percentage: 31.6 },
                  ]).map((item) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.name}</span>
                        <span className="text-pink-400 font-bold">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${item.name === 'Nữ' ? 'bg-pink-500' : 'bg-blue-500'}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Age tab */}
              {demoTab === 'age' && (
                <div className="space-y-3 py-1">
                  {(demographics?.ageBreakdown ?? [
                    { range: '18 - 24', percentage: 15.2 },
                    { range: '25 - 34', percentage: 52.8 },
                    { range: '35 - 44', percentage: 22.0 },
                    { range: '45+', percentage: 10.0 },
                  ]).map((item) => (
                    <div key={item.range} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">{item.range} tuổi</span>
                        <span className="text-purple-400 font-bold">{item.percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Standard Charts */}
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
          ) : <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu A/B test</p>}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Phân bổ ngân sách A/B Tests</h3>
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
        <div className="px-5 py-3 border-b"><h3 className="font-semibold text-slate-900">Chi tiết A/B Tests</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Tên test</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Ngân sách</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Impressions</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Clicks</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Conversions</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Doanh thu</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">ROAS</th>
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
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.testName}</td>
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
