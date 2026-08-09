'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Clock, CheckCircle, XCircle, AlertTriangle, Play, FileText, RefreshCw } from 'lucide-react';
import PageHeader from '@/app/components/page-header';

export default function AutomationContent() {
  const [data, setData] = useState<any>({ logs: [], rawLogs: '', lastSync: null, totalLogs: 0 });
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/automation');
      const json = await res?.json?.();
      setData(json ?? { logs: [], rawLogs: '', lastSync: null, totalLogs: 0 });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase?.()) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBg = (level: string) => {
    switch (level?.toLowerCase?.()) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Nhật Ký Tự Động" description="Theo dõi đồng bộ, cảnh báo KPI và lịch sử chạy" icon={Bell} onRefresh={fetchData} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Đồng bộ cuối</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data?.lastSync ? new Date(data.lastSync).toLocaleString('vi-VN') : 'Chưa có'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Tổng nhật ký</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{data?.totalLogs ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">Thành công</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{logs?.filter?.((l: any) => l?.level === 'success')?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Lỗi</span>
          </div>
          <p className="text-xl font-bold text-red-600">{logs?.filter?.((l: any) => l?.level === 'error')?.length ?? 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href="/sync-hub"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all whitespace-nowrap min-w-[130px]"
        >
          <RefreshCw size={14} /> Đến Sync Hub
        </Link>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:shadow-md transition text-gray-700 font-medium"
        >
          <FileText size={14} /> {showRaw ? 'Ẩn' : 'Xem'} nhật ký gốc
        </button>
      </div>

      {/* Raw Logs */}
      {showRaw && data?.rawLogs && (
        <div className="bg-gray-900 rounded-xl p-5 shadow-sm overflow-auto max-h-96">
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">{data?.rawLogs ?? ''}</pre>
        </div>
      )}

      {/* Log Entries */}
      <div className="space-y-2">
        {(logs ?? [])?.map?.((log: any, i: number) => (
          <div key={log?.id ?? i} className={`flex items-start gap-3 p-3 rounded-lg border ${getLevelBg(log?.level ?? '')}`}>
            {getLevelIcon(log?.level ?? '')}
            <div className="flex-1">
              <p className="text-sm text-gray-800">{log?.message ?? ''}</p>
              {log?.details && <p className="text-xs text-gray-500 mt-1">{log?.details}</p>}
              <p className="text-xs text-gray-400 mt-1">
                {log?.source ? `[${log.source}] ` : ''}
                {log?.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : ''}
              </p>
            </div>
          </div>
        )) ?? []}
      </div>

      {(logs ?? [])?.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">Chưa có log nào</div>
      )}
    </div>
  );
}
