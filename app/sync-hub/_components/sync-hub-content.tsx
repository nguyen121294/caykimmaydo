'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, Clock, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

type PlatformStatus = 'idle' | 'syncing' | 'success' | 'error';
type SyncDays = '7' | '30' | '90' | 'all';

interface SyncItem {
  id: string;
  name: string;
  apiRoute: string;
  payload?: any;
  status: PlatformStatus;
  lastSync: string | null;
  message?: string;
}

interface SyncJobStatus {
  id: string;
  platform: string;
  status: 'QUEUED' | 'RUNNING' | 'CONTINUING' | 'SUCCESS' | 'FAILED';
  stage: string;
  recordsFetched: number;
  recordsSaved: number;
  error?: string | null;
}

const SYNC_CONFIG: SyncItem[] = [
  { id: 'fb_page', name: 'Facebook Page (Organic)', apiRoute: '/api/marketing/sync/meta', payload: { platform: 'Facebook Page' }, status: 'idle', lastSync: null },
  { id: 'fb_ads', name: 'Facebook Ads (Dark Posts)', apiRoute: '/api/marketing/sync/meta', payload: { platform: 'Facebook Ads' }, status: 'idle', lastSync: null },
  { id: 'ig_bus', name: 'Instagram Business', apiRoute: '/api/marketing/sync/meta', payload: { platform: 'Instagram' }, status: 'idle', lastSync: null },
  { id: 'manychat', name: 'ManyChat (CRM / Inbox)', apiRoute: '/api/marketing/sync/manychat', status: 'idle', lastSync: null },
];

export default function SyncHubContent() {
  const [items, setItems] = useState<SyncItem[]>(SYNC_CONFIG);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [syncDays, setSyncDays] = useState<SyncDays>('7');

  const readJsonResponse = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      const contentType = res.headers.get('content-type') || 'không xác định';
      const preview = text.replace(/\s+/g, ' ').slice(0, 160);
      throw new Error(`API trả về ${res.status} (${contentType}), không phải JSON: ${preview}`);
    }
  };

  const applyJobStatuses = (jobs: SyncJobStatus[]) => {
    setItems(prev => prev.map(item => {
      const job = jobs.find(candidate => candidate.platform === item.payload?.platform);
      if (!job) return item;
      if (job.status === 'SUCCESS') {
        return {
          ...item,
          status: 'success',
          lastSync: new Date().toLocaleTimeString('vi-VN'),
          message: `Đã lấy ${job.recordsFetched}, lưu ${job.recordsSaved}`,
        };
      }
      if (job.status === 'FAILED') {
        return { ...item, status: 'error', message: job.error || 'Job đồng bộ thất bại' };
      }
      return {
        ...item,
        status: 'syncing',
        message: `${job.status} · ${job.stage}${job.recordsFetched > 0 ? ` (${job.recordsFetched} đã lấy)` : ''}`,
      };
    }));
  };

  const pollSyncGroup = async (groupId: string) => {
    for (let attempt = 0; attempt < 360; attempt++) {
      const res = await fetch(`/api/marketing/sync/jobs?groupId=${encodeURIComponent(groupId)}`, { cache: 'no-store' });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || `Không đọc được trạng thái job (${res.status})`);
      const jobs: SyncJobStatus[] = data.jobs || [];
      applyJobStatuses(jobs);
      if (jobs.length > 0 && jobs.every(job => job.status === 'SUCCESS' || job.status === 'FAILED')) {
        await fetchLogs();
        return jobs;
      }
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
    throw new Error('Job vẫn đang chạy nền sau 15 phút. Bạn có thể tải lại trang để xem log mới nhất.');
  };

  const dispatchSync = async (platforms: string[]) => {
    const res = await fetch('/api/marketing/sync/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platforms, days: syncDays }),
    });
    const data = await readJsonResponse(res);
    if (!res.ok || !data.success) throw new Error(data.error || `Không thể xếp hàng đồng bộ (${res.status})`);
    return data.groupId as string;
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch('/api/automation');
      const data = await readJsonResponse(res);
      setLogs(data?.logs?.slice(0, 30) || []); // Get last 30 logs as requested
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    setLastUpdate(new Date().toLocaleTimeString('vi-VN'));
  }, []);

  const handleSyncItem = async (index: number) => {
    const item = items[index];
    setItems(prev => prev.map((candidate, candidateIndex) => candidateIndex === index
      ? { ...candidate, status: 'syncing', message: 'QUEUED' }
      : candidate));

    try {
      if (item.payload?.platform) {
        const groupId = await dispatchSync([item.payload.platform]);
        await pollSyncGroup(groupId);
      } else {
        const res = await fetch(item.apiRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days: syncDays }),
        });
        const data = await readJsonResponse(res);
        if (!res.ok || !data.success) throw new Error(data.error || `Đồng bộ thất bại (${res.status})`);
        setItems(prev => prev.map((candidate, candidateIndex) => candidateIndex === index
          ? {
              ...candidate,
              status: 'success',
              lastSync: new Date().toLocaleTimeString('vi-VN'),
              message: data.message || 'Thành công',
            }
          : candidate));
      }
    } catch (e: any) {
      setItems(prev => {
        const arr = [...prev];
        arr[index].status = 'error';
        arr[index].message = e.message;
        return arr;
      });
    }
  };

  const handleSyncAll = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    toast.info('Đang xếp hàng đồng bộ Meta tuần tự...');
    const metaItems = items.filter(item => item.payload?.platform);
    setItems(prev => prev.map(item => item.payload?.platform
      ? { ...item, status: 'syncing', message: 'QUEUED' }
      : item));

    try {
      const groupId = await dispatchSync(metaItems.map(item => item.payload.platform));
      const jobs = await pollSyncGroup(groupId);
      const directIndexes = items
        .map((item, index) => item.payload?.platform ? -1 : index)
        .filter(index => index >= 0);
      for (const index of directIndexes) await handleSyncItem(index);
      const failed = jobs.filter(job => job.status === 'FAILED');
      if (failed.length > 0) toast.error(`${failed.length} nền tảng đồng bộ thất bại.`);
      else toast.success('Đã hoàn tất chuỗi đồng bộ Meta!');
    } catch (error: any) {
      toast.error(error?.message || 'Không thể đồng bộ Meta.');
      setItems(prev => prev.map(item => item.status === 'syncing'
        ? { ...item, status: 'error', message: error?.message || 'Lỗi đồng bộ' }
        : item));
    } finally {
      setIsSyncingAll(false);
      fetchLogs();
    }
  };

  const getStatusIcon = (status: PlatformStatus) => {
    switch (status) {
      case 'syncing': return <Loader2 size={18} className="animate-spin text-blue-500" />;
      case 'success': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'error': return <XCircle size={18} className="text-red-500" />;
      default: return <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-300"></div>;
    }
  };

  const parseLogDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details);
      return parsed;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader 
          title="Sync Hub (Đồng bộ)" 
          description="Quản lý và đồng bộ dữ liệu từ các nền tảng"
          icon={RefreshCw} 
        />
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            Khoảng thời gian đồng bộ
            <select
              value={syncDays}
              onChange={(event) => setSyncDays(event.target.value as SyncDays)}
              disabled={isSyncingAll || items.some(item => item.status === 'syncing')}
              className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="7">7 ngày gần nhất</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="90">90 ngày gần nhất</option>
              <option value="all">Toàn bộ thời gian</option>
            </select>
          </label>
          <div className="flex flex-col items-end">
          <button
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            className="flex items-center gap-2 px-6 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md hover:shadow-lg transition-all font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={isSyncingAll ? "animate-spin" : ""} />
            Đồng bộ tất cả nền tảng
          </button>
          <span className="text-xs text-gray-500 mt-2 font-medium">Dữ liệu cập nhật lần cuối lúc: {lastUpdate}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              Checklist Đồng Bộ
            </h3>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                    </div>
                    {item.status !== 'syncing' && (
                      <button 
                        onClick={() => handleSyncItem(idx)}
                        disabled={isSyncingAll}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 rounded"
                      >
                        Chạy lại
                      </button>
                    )}
                  </div>
                  {(item.lastSync || item.message) && (
                    <div className="pl-7 pr-2 flex justify-between items-center text-[11px]">
                      <span className={item.status === 'error' ? 'text-red-500 line-clamp-1' : 'text-slate-500'}>
                        {item.message || 'Sẵn sàng'}
                      </span>
                      {item.lastSync && <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1"><Clock size={10}/> {item.lastSync}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-slate-500" />
                Lịch Sử Cập Nhật (30 Lần Gần Nhất)
              </h3>
              <button onClick={fetchLogs} disabled={loadingLogs} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <RefreshCw size={14} className={loadingLogs ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Thời gian</th>
                    <th className="px-5 py-3">Nguồn</th>
                    <th className="px-5 py-3">Chi tiết (Bản ghi)</th>
                    <th className="px-5 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loadingLogs && logs.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">Chưa có lịch sử đồng bộ</td></tr>
                  ) : (
                    logs.map((log: any) => {
                      const details = parseLogDetails(log.details);
                      const isError = log.level === 'error';
                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-5 py-3 font-medium text-slate-700">
                            {log.source?.replace('sync-meta-route/', '')}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600">
                            {details?.recordsFetched !== undefined ? (
                              <div className="flex gap-3">
                                <span>Lấy: <b>{details.recordsFetched}</b></span>
                                <span>Lưu: <b>{details.recordsSaved}</b></span>
                              </div>
                            ) : (
                              <span className="line-clamp-2" title={log.message}>{log.message}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {isError ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                                <AlertTriangle size={10} /> Lỗi
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                <CheckCircle2 size={10} /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
