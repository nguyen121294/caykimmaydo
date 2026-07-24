'use client';
import { useEffect, useState } from 'react';
import { MessageSquare, Copy, Check, Filter, Users, Target, TrendingUp } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

const customerTypes = ['', 'Hỏi Giá', 'Do Dự', 'Trả Giá', 'Lạnh'];

export default function InboxContent() {
  const [data, setData] = useState<any>({ scripts: [], kpis: [] });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/inbox?${params.toString()}`);
      const json = await res?.json?.();
      setData(json ?? { scripts: [], kpis: [] });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [typeFilter]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator?.clipboard?.writeText?.(text ?? '');
      setCopiedId(id);
      toast.success('Đã copy!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Không thể copy');
    }
  };

  const getTypeColor = (type: string) => {
    if (type?.includes?.('Giá')) return 'from-blue-500 to-cyan-500';
    if (type?.includes?.('Dự')) return 'from-amber-500 to-orange-500';
    if (type?.includes?.('Trả')) return 'from-red-500 to-pink-500';
    if (type?.includes?.('Lạnh')) return 'from-gray-500 to-slate-500';
    return 'from-purple-500 to-indigo-500';
  };

  const getTypeEmoji = (type: string) => {
    if (type?.includes?.('Giá')) return '💬';
    if (type?.includes?.('Dự')) return '🤔';
    if (type?.includes?.('Trả')) return '💰';
    if (type?.includes?.('Lạnh')) return '❄️';
    return '📨';
  };

  const scripts = data?.scripts ?? [];
  const kpis = data?.kpis ?? [];

  // Group scripts by customer type
  const grouped: Record<string, any[]> = {};
  (scripts ?? [])?.forEach?.((s: any) => {
    const key = s?.customerType ?? 'Khác';
    if (!grouped[key]) grouped[key] = [];
    grouped[key]?.push?.(s);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Kịch Bản Inbox" description="Kịch bản chốt đơn theo từng loại khách hàng" icon={MessageSquare} onRefresh={fetchData} />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Tổng KH theo dõi</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{kpis?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">Đã chốt</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{kpis?.filter?.((k: any) => (k?.status ?? '')?.includes?.('chốt'))?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">Follow-up</span>
          </div>
          <p className="text-xl font-bold text-amber-600">{kpis?.filter?.((k: any) => (k?.status ?? '')?.includes?.('Follow'))?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Tổng Kịch Bản</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{scripts?.length ?? 0}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select value={typeFilter} onChange={(e: any) => setTypeFilter(e?.target?.value ?? '')} className="px-3 py-2 text-sm bg-white rounded-lg shadow-sm border-0 outline-none">
          <option value="">Tất cả loại khách</option>
          {customerTypes?.filter?.(Boolean)?.map?.((t: string) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Scripts grouped by type */}
      {Object.entries(grouped ?? {})?.map?.(([type, typeScripts]: [string, any[]]) => (
        <div key={type} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTypeEmoji(type)}</span>
            <h3 className="font-display font-semibold text-gray-800">{type}</h3>
            <span className="text-xs text-gray-400">({typeScripts?.length ?? 0} tin nhắn)</span>
          </div>
          <div className="space-y-2">
            {(typeScripts ?? [])?.map?.((s: any, i: number) => (
              <div key={s?.id ?? i} className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] text-white font-medium bg-gradient-to-r ${getTypeColor(type)}`}>
                        {s?.sender ?? ''}
                      </span>
                      {s?.label && <span className="text-[10px] text-gray-400">{s?.label}</span>}
                      <span className="text-[10px] text-gray-400">{s?.messageNumber ?? ''}</span>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-line">{s?.content ?? ''}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(s?.content ?? '', s?.id ?? String(i))}
                    className="p-2 rounded-lg bg-gray-100 hover:bg-indigo-100 text-gray-500 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
                    title="Copy"
                  >
                    {copiedId === (s?.id ?? String(i)) ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )) ?? []}
          </div>
        </div>
      )) ?? []}

      {(scripts ?? [])?.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">Không tìm thấy kịch bản nào</div>
      )}
    </div>
  );
}
