'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Trophy, TrendingUp, RefreshCw } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import BudgetChart from './budget-chart';
import WeeklyChart from './weekly-chart';

export default function AnalyticsContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [platformTab, setPlatformTab] = useState<'all' | 'facebook' | 'instagram'>('all');

  const [lastUpdate, setLastUpdate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      const json = await res?.json?.();
      setData(json ?? {});
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const tests = data?.abTests ?? [];
  const content = data?.content ?? [];
  
  // Lọc bài viết theo nền tảng
  const filteredContent = content.filter((c: any) => {
    if (platformTab === 'all') return true;
    if (platformTab === 'facebook') return c?.channel === 'Facebook Page';
    if (platformTab === 'instagram') return c?.channel === 'Instagram';
    return true;
  });

  // Lọc A/B Test theo nền tảng (Mặc định A/B Test thường chạy từ Facebook Ads)
  const filteredTests = platformTab === 'instagram' ? [] : tests;

  const topContent = [...filteredContent]?.sort?.((a: any, b: any) => {
    const va = parseInt(String(a?.views ?? '0')?.replace?.(/[^0-9]/g, '') ?? '0') || 0;
    const vb = parseInt(String(b?.views ?? '0')?.replace?.(/[^0-9]/g, '') ?? '0') || 0;
    return vb - va;
  })?.slice?.(0, 10) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader title="Bảng Phân Tích" description="Kết quả A/B Test, hiệu suất chiến dịch và phân tích chi tiết" icon={BarChart3} onRefresh={fetchData} />
        
        <div className="flex items-start gap-3">
          <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setPlatformTab('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platformTab === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Tất Cả
            </button>
            <button
              onClick={() => setPlatformTab('facebook')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platformTab === 'facebook' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Facebook
            </button>
            <button
              onClick={() => setPlatformTab('instagram')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${platformTab === 'instagram' ? 'bg-white shadow-sm text-pink-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Instagram
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-start">
            <Link
              href="/sync-hub"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all whitespace-nowrap min-w-[130px]"
            >
              <RefreshCw size={14} /> Đến Sync Hub
            </Link>
            {lastUpdate && (
              <span className="text-[10px] text-slate-400 mt-1 text-center tracking-tight block">
                Cập nhật: {lastUpdate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* A/B Test Table */}
      {filteredTests.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              Kết Quả A/B Test {platformTab === 'facebook' ? '(Facebook Ads)' : ''}
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
                {(filteredTests ?? [])?.map?.((t: any) => (
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
      )}

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
        <div className="p-5 border-b flex items-center justify-between">
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Lượt lưu/thích</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tương tác</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ROAS</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nội dung / Đề xuất AI</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(topContent ?? [])?.map?.((c: any) => (
                <tr key={c?.contentId ?? c?.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate">{c?.contentId ?? ''}</td>
                  <td className="px-4 py-3">{c?.contentType ?? 'BÀI VIẾT'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      (c?.channel ?? '') === 'Instagram' ? 'bg-pink-100 text-pink-700 border border-pink-200' :
                      (c?.channel ?? '') === 'Facebook Page' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {c?.channel ?? 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{c?.views ?? '0'}</td>
                  <td className="px-4 py-3">{c?.saves ?? '0'}</td>
                  <td className="px-4 py-3">{c?.engageRate ?? '0%'}</td>
                  <td className="px-4 py-3 font-semibold text-indigo-600">{c?.roas ?? '—'}</td>
                  <td className="px-4 py-3 text-xs max-w-[250px] truncate">{c?.aiSuggestion ?? ''}</td>
                </tr>
              )) ?? []}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
