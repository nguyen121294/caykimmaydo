'use client';
import { useEffect, useState } from 'react';
import { BarChart3, Trophy, TrendingUp, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import BudgetChart from './budget-chart';
import WeeklyChart from './weekly-chart';

export default function AnalyticsContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [platformTab, setPlatformTab] = useState<'all' | 'facebook' | 'instagram'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      const json = await res?.json?.();
      setData(json ?? {});
    } catch {} finally { setLoading(false); }
  };

  const safeJsonFetch = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    if (res.status === 401 || res.status === 403) {
      return { success: false, error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn. Vui lòng vào trang Kết Nối để lưu Token.' };
    }
    return { success: false, error: `Máy chủ trả về HTTP ${res.status}: không đúng định dạng JSON.` };
  };

  const handleSyncMeta = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);

      const platforms = ['Facebook Page', 'Facebook Ads', 'Instagram'];
      const results = await Promise.allSettled(
        platforms.map(platform => safeJsonFetch('/api/marketing/sync/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform }),
        }))
      );

      const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      if (successes > 0) {
        setSyncMessage({ type: 'success', text: `Đã đồng bộ thành công ${successes}/${platforms.length} nền tảng.` });
        await fetchData();
      } else {
        setSyncMessage({ type: 'error', text: 'Đồng bộ không thành công. Vui lòng kiểm tra lại cấu hình.' });
      }
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: err?.message || 'Có lỗi xảy ra khi đồng bộ' });
    } finally {
      setSyncing(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Bảng Phân Tích" description="Kết quả A/B Test, hiệu suất chiến dịch và phân tích chi tiết" icon={BarChart3} onRefresh={fetchData} />
        
        <div className="flex items-center gap-3">
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
          
          <button
            onClick={handleSyncMeta}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
          syncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {syncMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{syncMessage.text}</span>
        </div>
      )}

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

