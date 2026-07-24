'use client';
import { useEffect, useState } from 'react';
import { BarChart3, Trophy, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import BudgetChart from './budget-chart';
import WeeklyChart from './weekly-chart';

export default function AnalyticsContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      const json = await res?.json?.();
      setData(json ?? {});
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const tests = data?.abTests ?? [];
  const content = data?.content ?? [];
  const topContent = [...(content ?? [])]?.sort?.((a: any, b: any) => {
    const va = parseInt(String(a?.views ?? '0')?.replace?.(/[^0-9]/g, '') ?? '0') || 0;
    const vb = parseInt(String(b?.views ?? '0')?.replace?.(/[^0-9]/g, '') ?? '0') || 0;
    return vb - va;
  })?.slice?.(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Bảng Phân Tích" description="Kết quả A/B Test, hiệu suất chiến dịch và phân tích chi tiết" icon={BarChart3} onRefresh={fetchData} />

      {/* A/B Test Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Kết Quả A/B Test
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã Test</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tên Test</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CTR A</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">CTR B</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ROAS A</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ROAS B</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Người thắng</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Độ tin cậy</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(tests ?? [])?.map?.((t: any) => (
                <tr key={t?.testId ?? t?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{t?.testId ?? ''}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate">{t?.testName ?? ''}</td>
                  <td className="px-4 py-3">{t?.ctrA ?? 0}%</td>
                  <td className="px-4 py-3">{t?.ctrB ?? 0}%</td>
                  <td className="px-4 py-3 font-semibold">{t?.roasA ?? 0}x</td>
                  <td className="px-4 py-3 font-semibold">{t?.roasB ?? 0}x</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (t?.winner ?? '')?.includes?.('A') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {t?.winner ?? ''}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${
                      (t?.confidence ?? '')?.includes?.('High') ? 'text-emerald-600' :
                      (t?.confidence ?? '')?.includes?.('Medium') ? 'text-amber-600' : 'text-gray-500'
                    }`}>{t?.confidence ?? ''}</span>
                  </td>
                </tr>
              )) ?? []}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Phân Bổ Ngân Sách Funnel</h3>
          <BudgetChart data={data?.budgetAllocation ?? []} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Xu Hướng Tuần</h3>
          <WeeklyChart data={data?.weeklyTrend ?? []} />
        </div>
      </div>

      {/* Top Content */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-500" />
            Nội Dung Hiệu Suất Cao Nhất
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Kênh</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Lượt xem</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Lượt lưu</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tương tác</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ROAS</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Đề xuất AI</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(topContent ?? [])?.map?.((c: any) => (
                <tr key={c?.contentId ?? c?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{c?.contentId ?? ''}</td>
                  <td className="px-4 py-3">{c?.contentType ?? ''}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (c?.channel ?? '') === 'Instagram' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'
                    }`}>{c?.channel ?? ''}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{c?.views ?? '0'}</td>
                  <td className="px-4 py-3">{c?.saves ?? '0'}</td>
                  <td className="px-4 py-3">{c?.engageRate ?? '0'}</td>
                  <td className="px-4 py-3 font-semibold text-indigo-600">{c?.roas ?? '—'}</td>
                  <td className="px-4 py-3 text-xs">{c?.aiSuggestion ?? ''}</td>
                </tr>
              )) ?? []}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
