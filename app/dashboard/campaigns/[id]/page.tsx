'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Info } from 'lucide-react';
import DashboardShell from '@/app/components/dashboard-shell';
import PageHeader from '@/app/components/page-header';

export default function CampaignDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const campaignName = decodeURIComponent(params.id);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/campaigns/${params.id}`);
      const json = await res.json();
      setData(json ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  // Format YYYY-MM-DD string to DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <DashboardShell>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Quay lại Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <PageHeader title={campaignName} description="Phân tích hiệu suất theo chiến dịch và chi tiết từng ngày" />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-14rem)]">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">Dữ liệu được bóc tách chi tiết theo từng ngày (từ mới nhất đến cũ nhất).</span>
          </div>
        </div>

        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 whitespace-nowrap">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Ngày</th>
                <th className="px-4 py-3">CPM</th>
                <th className="px-4 py-3">Click liên kết</th>
                <th className="px-4 py-3">CPC (liên kết)</th>
                <th className="px-4 py-3">%CTR (liên kết)</th>
                <th className="px-4 py-3">Click (tất cả)</th>
                <th className="px-4 py-3">CPC (tất cả)</th>
                <th className="px-4 py-3">%CTR (tất cả)</th>
                <th className="px-4 py-3">Xem trang đích</th>
                <th className="px-4 py-3">Chi Phí</th>
                <th className="px-4 py-3">Doanh Thu</th>
                <th className="px-4 py-3">CPA</th>
                <th className="px-4 py-3 rounded-tr-lg">Chuyển Đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : data.length > 0 ? (
                data.map((record: any, idx: number) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {formatDate(record.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {record.cpm > 0 ? `${record.cpm.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {record.linkClicks.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {record.cpcLink > 0 ? `${record.cpcLink.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${record.ctrLink >= 1 ? 'bg-emerald-100 text-emerald-700' : record.ctrLink > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {record.ctrLink > 0 ? `${record.ctrLink}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {record.clicks.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {record.cpc > 0 ? `${record.cpc.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {record.ctr > 0 ? `${record.ctr}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {record.landingPageViews.toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">
                      {record.spend > 0 ? `${record.spend.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-medium whitespace-nowrap">
                      {record.revenue > 0 ? `${record.revenue.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">
                      {record.cpa > 0 ? `${record.cpa.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      {record.conversions}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-400">
                    Chưa có dữ liệu theo ngày cho chiến dịch này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
