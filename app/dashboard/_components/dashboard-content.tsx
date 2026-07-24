'use client';
import { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Megaphone, Percent, Film, Calendar, MessageSquare, AlertTriangle, CheckCircle, XCircle, Info, CloudOff } from 'lucide-react';
import KpiCard from '@/app/components/kpi-card';
import PageHeader from '@/app/components/page-header';
import { LayoutDashboard } from 'lucide-react';
import RevenueChart from './revenue-chart';
import FunnelChart from './funnel-chart';

export default function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const json = await res?.json?.();
      setData(json ?? {});
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng Quan"
        description="Theo dõi KPI và hiệu suất kinh doanh theo thời gian thực"
        icon={LayoutDashboard}
        onRefresh={fetchData}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard title="Tổng Doanh Thu" value={kpis?.totalRevenue ?? 0} prefix="" suffix="đ" icon={DollarSign} color="from-emerald-500 to-teal-600" />
        <KpiCard title="Tổng Đơn Hàng" value={kpis?.totalOrders ?? 0} icon={ShoppingCart} color="from-blue-500 to-indigo-600" />
        <KpiCard title="ROAS" value={kpis?.roas ?? 0} suffix="x" icon={TrendingUp} color="from-purple-500 to-violet-600" />
        <KpiCard title="Chi Phí Quảng Cáo" value={kpis?.totalAdSpend ?? 0} prefix="" suffix="đ" icon={Megaphone} color="from-orange-500 to-red-500" />
        <KpiCard title="Tỷ Lệ Chuyển Đổi" value={kpis?.conversionRate ?? 0} suffix="%" icon={Percent} color="from-pink-500 to-rose-600" />
      </div>

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
    </div>
  );
}
