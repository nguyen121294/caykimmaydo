'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Megaphone, Percent, ArrowUpRight } from 'lucide-react';

export interface MonthlyStatItem {
  monthKey: string;
  monthLabel: string;
  shortLabel: string;
  revenue: number;
  adSpend: number;
  adsPercentage: number;
  roas: number;
  orderCount: number;
}

const formatCurrency = (val: number) => {
  return (val || 0).toLocaleString('vi-VN') + ' đ';
};

const formatShortCurrency = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}Tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return `${v || 0}`;
};

export default function MonthlyPerformance({ data }: { data: MonthlyStatItem[] }) {
  const safeData = Array.isArray(data) && data.length > 0 ? data : [];

  // Tính tổng 6 tháng
  const totalRevenue = safeData.reduce((sum, item) => sum + (item.revenue || 0), 0);
  const totalAdSpend = safeData.reduce((sum, item) => sum + (item.adSpend || 0), 0);
  const avgAdsPercentage = totalRevenue > 0 ? Number(((totalAdSpend / totalRevenue) * 100).toFixed(1)) : 0;
  const totalRoas = totalAdSpend > 0 ? Number((totalRevenue / totalAdSpend).toFixed(2)) : 0;

  const getAdsPercentageBadge = (pct: number, revenue: number) => {
    if (revenue === 0) return <span className="text-slate-400 font-mono text-xs">—</span>;
    if (pct === 0) return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">0%</span>;
    if (pct <= 15) return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">{pct}%</span>;
    if (pct <= 30) return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">{pct}%</span>;
    return <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">{pct}%</span>;
  };

  const getRoasBadge = (roas: number, adSpend: number) => {
    if (adSpend === 0) return <span className="text-slate-400 font-mono text-xs">—</span>;
    if (roas >= 4) return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">{roas}x</span>;
    if (roas >= 2) return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">{roas}x</span>;
    return <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60">{roas}x</span>;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <BarChart3 size={20} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              Tổng Hợp Doanh Thu &amp; Chi Phí Ads (6 Tháng Gần Nhất)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              So sánh tương quan giữa doanh thu bán hàng thực tế và chi phí quảng cáo marketing
            </p>
          </div>
        </div>

        {/* Quick summary badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
            <span className="text-slate-500">Tổng DT 6T:</span>
            <span className="font-bold text-indigo-700">{formatShortCurrency(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50/70 border border-orange-100 text-xs">
            <span className="text-slate-500">Tổng Ads 6T:</span>
            <span className="font-bold text-orange-700">{formatShortCurrency(totalAdSpend)}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50/70 border border-purple-100 text-xs">
            <span className="text-slate-500">ROAS TB:</span>
            <span className="font-bold text-purple-700">{totalRoas > 0 ? `${totalRoas}x` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Grid Content: Biểu đồ (Trái) & Bảng số liệu (Phải) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Bar Chart */}
        <div className="xl:col-span-6 bg-slate-50/70 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-indigo-600" /> Biểu đồ 6 tháng liên tục
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Đơn vị: VNĐ</span>
          </div>
          <div className="h-72 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="shortLabel"
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickFormatter={formatShortCurrency}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    padding: '10px 14px',
                  }}
                  formatter={(value: any, name: any) => [
                    formatCurrency(Number(value) || 0),
                    name === 'revenue' ? 'Doanh thu' : 'Chi phí Ads'
                  ]}
                  labelFormatter={(label, payload) => {
                    const item = payload?.[0]?.payload;
                    return item ? item.monthLabel : label;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                  formatter={(value) => (value === 'revenue' ? 'Doanh thu' : 'Chi phí Ads')}
                />
                <Bar
                  dataKey="revenue"
                  name="revenue"
                  fill="#6366f1"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="adSpend"
                  name="adSpend"
                  fill="#f97316"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Detailed Summary Table */}
        <div className="xl:col-span-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bảng Tổng Hợp Chi Tiết Theo Tháng
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {safeData.length} tháng gần nhất
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/60 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Tháng</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-indigo-700">Doanh thu</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-orange-700">Chi phí Ads</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Tỷ lệ Ads/DT (%)</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {safeData.map((item) => (
                  <tr key={item.monthKey} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {item.monthLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-indigo-600 whitespace-nowrap">
                      {formatCurrency(item.revenue)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-orange-600 whitespace-nowrap">
                      {formatCurrency(item.adSpend)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getAdsPercentageBadge(item.adsPercentage, item.revenue)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getRoasBadge(item.roas, item.adSpend)}
                    </td>
                  </tr>
                ))}

                {safeData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Chưa có dữ liệu thống kê tháng
                    </td>
                  </tr>
                )}
              </tbody>
              {safeData.length > 0 && (
                <tfoot className="bg-slate-50/90 font-bold border-t-2 border-slate-200 text-slate-800">
                  <tr>
                    <td className="py-3 px-3 uppercase text-[11px] text-slate-900 whitespace-nowrap">
                      Tổng cộng 6T
                    </td>
                    <td className="py-3 px-3 text-right text-indigo-700 whitespace-nowrap">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td className="py-3 px-3 text-right text-orange-700 whitespace-nowrap">
                      {formatCurrency(totalAdSpend)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100/70 text-indigo-800">
                        {avgAdsPercentage}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100/70 text-purple-800">
                        {totalRoas > 0 ? `${totalRoas}x` : '—'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
