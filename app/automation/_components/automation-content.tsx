'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FileText,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import PageHeader from '@/app/components/page-header';

interface AutomationLog {
  id: string;
  timestamp?: string;
  level?: string;
  source?: string;
  message?: string;
  details?: string;
}

interface AutomationData {
  logs: AutomationLog[];
  rawLogs: string;
  lastSync: string | null;
  totalLogs: number;
}

const EMPTY_DATA: AutomationData = { logs: [], rawLogs: '', lastSync: null, totalLogs: 0 };

function formatDetails(details?: string): string {
  if (!details) return '';
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

function buildDebugText(log: AutomationLog): string {
  return [
    `Thời gian: ${log.timestamp ? new Date(log.timestamp).toISOString() : ''}`,
    `Mức độ: ${log.level || ''}`,
    `Nguồn: ${log.source || ''}`,
    `Thông báo: ${log.message || ''}`,
    'Chi tiết:',
    formatDetails(log.details) || '(không có)',
  ].join('\n');
}

export default function AutomationContent() {
  const [data, setData] = useState<AutomationData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/automation', { cache: 'no-store' });
      const json = await res.json();
      setData(res.ok ? { ...EMPTY_DATA, ...json } : EMPTY_DATA);
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(current => current === id ? null : current), 1800);
    } catch {
      setCopiedId(null);
    }
  };

  const toggleLog = (id: string) => {
    setExpandedLogs(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getLevelIcon = (level = '') => {
    switch (level.toLowerCase()) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

  const getLevelBg = (level = '') => {
    switch (level.toLowerCase()) {
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const logs = data.logs;
  const errorLogs = logs.filter(log => log.level?.toLowerCase() === 'error');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhật ký tự động"
        description="Theo dõi đồng bộ, cảnh báo KPI và lịch sử chạy"
        icon={Bell}
        onRefresh={fetchData}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Đồng bộ cuối</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {data.lastSync ? new Date(data.lastSync).toLocaleString('vi-VN') : 'Chưa có'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Tổng nhật ký</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{data.totalLogs}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">Thành công</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {logs.filter(log => ['success', 'info'].includes(log.level?.toLowerCase() || '')).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Lỗi</span>
          </div>
          <p className="text-xl font-bold text-red-600">{errorLogs.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/sync-hub"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all whitespace-nowrap min-w-[130px]"
        >
          <RefreshCw size={14} /> Đến Sync Hub
        </Link>
        <button
          type="button"
          onClick={() => setShowRaw(current => !current)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white rounded-lg shadow-sm hover:shadow-md transition text-gray-700 font-medium"
        >
          <FileText size={14} /> {showRaw ? 'Ẩn' : 'Xem'} nhật ký gốc
        </button>
        {errorLogs.length > 0 && (
          <button
            type="button"
            onClick={() => copyText('all-errors', errorLogs.map(buildDebugText).join('\n\n---\n\n'))}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium hover:bg-red-100 transition"
          >
            {copiedId === 'all-errors' ? <Check size={14} /> : <Copy size={14} />}
            {copiedId === 'all-errors' ? 'Đã sao chép' : `Sao chép ${errorLogs.length} lỗi`}
          </button>
        )}
      </div>

      {showRaw && data.rawLogs && (
        <div className="relative bg-gray-900 rounded-xl p-5 shadow-sm overflow-auto max-h-96">
          <button
            type="button"
            onClick={() => copyText('raw-logs', data.rawLogs)}
            className="sticky top-0 float-right flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gray-800 text-xs text-gray-200 hover:bg-gray-700"
          >
            {copiedId === 'raw-logs' ? <Check size={13} /> : <Copy size={13} />}
            {copiedId === 'raw-logs' ? 'Đã sao chép' : 'Sao chép'}
          </button>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">{data.rawLogs}</pre>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log, index) => {
          const id = log.id || String(index);
          const expanded = expandedLogs.has(id);
          const details = formatDetails(log.details);
          return (
            <article key={id} className={`rounded-lg border ${getLevelBg(log.level)}`}>
              <div className="flex items-start gap-3 p-3">
                <div className="mt-0.5">{getLevelIcon(log.level)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 break-words">{log.message || '(không có thông báo)'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {log.source ? `[${log.source}] ` : ''}
                    {log.timestamp ? new Date(log.timestamp).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyText(id, buildDebugText(log))}
                    title="Sao chép log để debug"
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-white/70"
                  >
                    {copiedId === id ? <Check size={14} /> : <Copy size={14} />}
                    <span className="hidden sm:inline">{copiedId === id ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLog(id)}
                    aria-expanded={expanded}
                    title={expanded ? 'Thu gọn chi tiết' : 'Mở chi tiết'}
                    className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-white/70"
                  >
                    {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span className="hidden sm:inline">Chi tiết</span>
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-black/5 bg-white/60 p-3">
                  <dl className="grid gap-2 text-xs sm:grid-cols-[100px_1fr]">
                    <dt className="font-semibold text-gray-500">ID</dt>
                    <dd className="font-mono text-gray-700 break-all">{log.id || '(không có)'}</dd>
                    <dt className="font-semibold text-gray-500">Nguồn</dt>
                    <dd className="text-gray-700 break-words">{log.source || '(không có)'}</dd>
                    <dt className="font-semibold text-gray-500">Thông báo</dt>
                    <dd className="text-gray-700 whitespace-pre-wrap break-words">{log.message || '(không có)'}</dd>
                  </dl>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-semibold text-gray-500">Details</p>
                    <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-100 whitespace-pre-wrap break-words">
                      {details || '(không có details)'}
                    </pre>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {logs.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">Chưa có log nào</div>
      )}
    </div>
  );
}
