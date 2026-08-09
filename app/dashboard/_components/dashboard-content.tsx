'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, ShoppingCart, TrendingUp, Megaphone, Percent, Film, Calendar, MessageSquare, AlertTriangle, CheckCircle, XCircle, Info, CloudOff, RefreshCw } from 'lucide-react';
import KpiCard from '@/app/components/kpi-card';
import PageHeader from '@/app/components/page-header';
import { LayoutDashboard } from 'lucide-react';
import RevenueChart from './revenue-chart';
import FunnelChart from './funnel-chart';
import CampaignManager from '../campaigns/_components/campaign-manager';

export default function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');
  const [lastUpdate, setLastUpdate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?days=${timeRange}`);
      const json = await res?.json?.();
      setData(json ?? {});
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded-lg w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 })?.map?.((_: any, i: number) => (
            <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis ?? {};
  const hasData = data?.hasData ?? false;

  // Empty state khi chưa có dữ liệu thật
  if (!hasData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Tổng Quan"
          description="Theo dõi KPI và hiệu suất kinh doanh theo thời gian thực"
          icon={LayoutDashboard}
          onRefresh={fetchData}
        />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-gray-100 rounded-full p-6 mb-6">
            <CloudOff className="w-16 h-16 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Chưa có dữ liệu thật</h3>
          <p className="text-gray-500 text-center max-w-md mb-6">
            Vui lòng kết nối và đồng bộ nền tảng để xem dữ liệu thực tế.
          </p>
          <a
            href="/connections"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Kết nối nền tảng
          </a>
        </div>
      </div>
    );
  }

  // KPI Cards
  const renderKpis = () => {
    const kpiData = data?.kpis ?? {};
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Tổng Doanh Thu" value={kpiData?.totalRevenue ?? 0} prefix="" suffix="đ" icon={DollarSign} color="from-emerald-500 to-teal-600" />
        <KpiCard title="Tổng Đơn Hàng" value={kpiData?.totalOrders ?? 0} icon={ShoppingCart} color="from-blue-500 to-indigo-600" />
        <KpiCard title="ROAS" value={kpiData?.roas ?? 0} suffix="x" icon={TrendingUp} color="from-purple-500 to-violet-600" />
        <KpiCard title="Chi Phí Quảng Cáo" value={kpiData?.totalAdSpend ?? 0} prefix="" suffix="đ" icon={Megaphone} color="from-orange-500 to-red-500" />
        <KpiCard title="Tỷ Lệ Chuyển Đổi" value={kpiData?.conversionRate ?? 0} suffix="%" icon={Percent} color="from-pink-500 to-rose-600" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng Quan"
        description="Theo dõi KPI và hiệu suất kinh doanh theo thời gian thực"
        icon={LayoutDashboard}
        onRefresh={fetchData}
      >
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
        >
          <option value="7">7 ngày qua</option>
          <option value="14">14 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="60">60 ngày qua</option>
          <option value="90">90 ngày qua</option>
          <option value="180">6 tháng qua</option>
          <option value="all">Tất cả thời gian</option>
        </select>
        
        <div className="flex flex-col items-center justify-start">
          <Link
            href="/sync-hub"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all whitespace-nowrap min-w-[130px]"
          >
            <RefreshCw size={14} />
            Đến Sync Hub
          </Link>
          {lastUpdate && (
            <span className="text-[10px] text-slate-400 mt-1 text-center tracking-tight block">
              Cập nhật: {lastUpdate}
            </span>
          )}
        </div>
      </PageHeader>

      {/* KPI Cards */}
      {renderKpis()}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Doanh Thu 30 Ngày Gần Nhất</h3>
          {(data?.revenueTrend ?? []).length > 0 ? (
            <RevenueChart data={data?.revenueTrend ?? []} />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu doanh thu</div>
          )}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Hiệu Suất Funnel TOF / MOF / BOF</h3>
          {(data?.funnelData ?? []).length > 0 ? (
            <FunnelChart data={data?.funnelData ?? []} />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu chiến dịch</div>
          )}
        </div>
      </div>

      {/* Tables Section - Full Width */}
      <div className="space-y-6">
        
        {/* Detailed Records Table (Daily) */}
        <div className="bg-white rounded-xl p-5 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 shrink-0">Chi Tiết Theo Ngày</h3>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Ngày</th>
                  <th className="px-4 py-3">Doanh Thu</th>
                  <th className="px-4 py-3">Chi Phí Ads</th>
                  <th className="px-4 py-3 rounded-tr-lg">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data?.detailedRecords?.length > 0 ? (
                  data?.detailedRecords?.map((record: any, index: number) => (
                    <tr key={index} className="bg-white border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{record.date}</td>
                      <td className="px-4 py-3 text-emerald-600 font-medium whitespace-nowrap">
                        {record.revenue > 0 ? `${record.revenue.toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                      <td className="px-4 py-3 text-red-600 font-medium whitespace-nowrap">
                        {record.adSpend > 0 ? `${record.adSpend.toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${record.roas >= 2 ? 'bg-emerald-100 text-emerald-700' : record.roas > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {record.roas > 0 ? `${record.roas}x` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu chi tiết
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign Records Table */}
        <div className="bg-white rounded-xl p-5 shadow-sm overflow-hidden flex flex-col h-[400px]">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 shrink-0">Hiệu Suất Từng Chiến Dịch</h3>
          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Tên Chiến Dịch</th>
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
                {data?.campaignRecords?.length > 0 ? (
                  data.campaignRecords.map((record: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 min-w-[200px] break-words" title={record.name}>
                        {record.name}
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
                      Chưa có dữ liệu chiến dịch
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend Table */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-semibold text-blue-800 uppercase mb-2 flex items-center gap-1">
            <Info size={14} /> Chú giải chỉ số
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
              <span className="font-semibold text-gray-800 block">ROAS</span>
              <span className="text-gray-500 text-xs">Return On Ad Spend</span>
              <div className="mt-1 text-xs text-blue-600 bg-blue-50 py-1 px-2 rounded inline-block">Doanh thu / Chi phí</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
              <span className="font-semibold text-gray-800 block">%CTR</span>
              <span className="text-gray-500 text-xs">Click-Through Rate</span>
              <div className="mt-1 text-xs text-blue-600 bg-blue-50 py-1 px-2 rounded inline-block">(Click / Hiển thị) x 100</div>
            </div>
            <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
              <span className="font-semibold text-gray-800 block">CPA</span>
              <span className="text-gray-500 text-xs">Cost Per Action</span>
              <div className="mt-1 text-xs text-blue-600 bg-blue-50 py-1 px-2 rounded inline-block">Chi phí / Chuyển đổi</div>
            </div>
            
            {/* Phễu Funnel spans all columns */}
            <div className="bg-white p-3 rounded shadow-sm border border-blue-50 md:col-span-3">
              <span className="font-semibold text-gray-800 block mb-1">Phân loại Phễu chiến dịch (Funnel)</span>
              <span className="text-gray-500 text-xs mb-2 block">Hệ thống tự động phân loại số liệu dựa theo từ khóa có trong Tên Chiến Dịch quảng cáo của bạn.</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
                <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/50">
                  <strong className="text-blue-700 block mb-0.5">TOF (Tập Lạnh)</strong>
                  Nhận diện, tiếp cận khách hàng mới. 
                  <div className="mt-1.5 text-gray-500">Từ khóa: <code className="bg-gray-100 px-1 py-0.5 rounded">tof</code> <code className="bg-gray-100 px-1 py-0.5 rounded">reach</code> <code className="bg-gray-100 px-1 py-0.5 rounded">view</code> <code className="bg-gray-100 px-1 py-0.5 rounded">tương tác</code></div>
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/50">
                  <strong className="text-blue-700 block mb-0.5">MOF (Tập Ấm)</strong>
                  Thu hút, kéo tin nhắn (Mặc định).
                  <div className="mt-1.5 text-gray-500">Từ khóa: <code className="bg-gray-100 px-1 py-0.5 rounded">mof</code> <code className="bg-gray-100 px-1 py-0.5 rounded">mess</code> <code className="bg-gray-100 px-1 py-0.5 rounded">tin nhắn</code> <code className="bg-gray-100 px-1 py-0.5 rounded">lead</code></div>
                </div>
                <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100/50">
                  <strong className="text-blue-700 block mb-0.5">BOF (Tập Nóng)</strong>
                  Chốt sale, bám đuổi (Retargeting).
                  <div className="mt-1.5 text-gray-500">Từ khóa: <code className="bg-gray-100 px-1 py-0.5 rounded">bof</code> <code className="bg-gray-100 px-1 py-0.5 rounded">retarget</code> <code className="bg-gray-100 px-1 py-0.5 rounded">chuyển đổi</code> <code className="bg-gray-100 px-1 py-0.5 rounded">purchase</code></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Cảnh Báo Gần Đây
          </h3>
          <div className="space-y-2">
            {(data?.alerts ?? []).length > 0 ? (
              (data?.alerts ?? [])?.map?.((alert: any, i: number) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alert?.type)}`}>
                  {getAlertIcon(alert?.type)}
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{alert?.message ?? ''}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert?.time ?? ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">Chưa có cảnh báo</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Thao Tác Nhanh</h3>
          <div className="space-y-3">
            <a href="/content" className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
              <Film className="w-5 h-5 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">Xem Kho Nội Dung</span>
            </a>
            <a href="/analytics" className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Phân Tích Chiến Dịch</span>
            </a>
            <a href="/inbox" className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition">
              <MessageSquare className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-pink-700">Kịch Bản Chốt Đơn</span>
            </a>
            <a href="/orders" className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Quản Lý Đơn Hàng</span>
            </a>
          </div>
        </div>
      </div>

      {/* Campaigns Section */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6">
          <CampaignManager timeRange={timeRange === 'all' ? '0' : timeRange} />
        </div>
      </div>
    </div>
  );
}
