'use client';
import { useEffect, useState } from 'react';
import { Film, Filter, Calendar as CalendarIcon, Eye, Clock, Target, MessageSquare, Bookmark, Check, X } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

const stages = ['', 'TOF', 'MOF', 'BOF'];
const pillars = ['', 'BEFORE-AFTER', 'PROCESS', 'PROBLEM-SOLUTION', 'PINTEREST', 'BODY TYPE', 'TESTIMONIAL', 'SOCIAL PROOF', 'FAQ', 'BEHIND', 'COMPARISON', 'STYLING', 'URGENCY', 'DISCOUNT', 'FOMO', 'RE-ENGAGEMENT'];
const statuses = ['', 'Chưa Dùng', 'Đã Dùng', 'Đã Lên Lịch'];

export default function ContentContent() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('');
  const [pillar, setPillar] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [view, setView] = useState<'scripts' | 'calendar'>('scripts');
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (stage) params.set('stage', stage);
      if (pillar) params.set('pillar', pillar);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/content?${params.toString()}`);
      const json = await res?.json?.();
      setScripts(json?.scripts ?? []);
      setCalendar(json?.calendar ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [stage, pillar, statusFilter]);

  const updateStatus = async (scriptId: string, newStatus: string) => {
    try {
      await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, status: newStatus }),
      });
      toast.success(`Cập nhật ${scriptId} thành công`);
      fetchData();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const getStageColor = (s: string) => {
    if (s === 'TOF') return 'bg-blue-100 text-blue-700';
    if (s === 'MOF') return 'bg-orange-100 text-orange-700';
    if (s === 'BOF') return 'bg-emerald-100 text-emerald-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getCalendarStatusColor = (s: string) => {
    if (s?.includes?.('Đã Đăng')) return 'bg-emerald-100 text-emerald-700';
    if (s?.includes?.('Đang')) return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Kho Nội Dung" description="32 kịch bản video quảng cáo & lịch nội dung 30 ngày" icon={Film} onRefresh={fetchData} />

      {/* Tabs + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-white rounded-lg shadow-sm">
          <button onClick={() => setView('scripts')} className={`px-4 py-2 text-sm rounded-lg font-medium transition ${view === 'scripts' ? 'gradient-bg text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Film size={14} className="inline mr-1.5" />Kịch Bản ({scripts?.length ?? 0})
          </button>
          <button onClick={() => setView('calendar')} className={`px-4 py-2 text-sm rounded-lg font-medium transition ${view === 'calendar' ? 'gradient-bg text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            <CalendarIcon size={14} className="inline mr-1.5" />Lịch Nội Dung
          </button>
        </div>

        {view === 'scripts' && (
          <>
            <select value={stage} onChange={(e: any) => setStage(e?.target?.value ?? '')} className="px-3 py-2 text-sm bg-white rounded-lg shadow-sm border-0 outline-none">
              <option value="">Tất cả Giai Đoạn</option>
              {stages?.filter?.(Boolean)?.map?.((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={pillar} onChange={(e: any) => setPillar(e?.target?.value ?? '')} className="px-3 py-2 text-sm bg-white rounded-lg shadow-sm border-0 outline-none">
              <option value="">Tất cả Loại</option>
              {pillars?.filter?.(Boolean)?.map?.((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={(e: any) => setStatusFilter(e?.target?.value ?? '')} className="px-3 py-2 text-sm bg-white rounded-lg shadow-sm border-0 outline-none">
              <option value="">Tất cả Trạng thái</option>
              {statuses?.filter?.(Boolean)?.map?.((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
      </div>

      {/* Scripts Grid */}
      {view === 'scripts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(scripts ?? [])?.map?.((script: any) => (
            <div key={script?.scriptId ?? script?.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600">{script?.scriptId ?? ''}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStageColor(script?.funnelStage ?? '')}`}>{script?.funnelStage ?? ''}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    script?.status === 'Đã Dùng' ? 'bg-emerald-100 text-emerald-700' :
                    script?.status === 'Đã Lên Lịch' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{script?.status ?? 'Chưa Dùng'}</span>
                </div>

                <p className="text-xs text-gray-500 mb-1">{(script?.contentType ?? '')?.replace?.(/\n/g, ' ')}</p>

                {/* Hook */}
                <div className="bg-indigo-50 rounded-lg p-3 mb-3">
                  <p className="text-[10px] text-indigo-500 font-medium mb-1">🎣 HOOK</p>
                  <p className="text-sm text-indigo-900 font-medium whitespace-pre-line">{(script?.hook ?? '')?.replace?.(/\n/g, ' ')}</p>
                </div>

                {expandedScript === script?.scriptId ? (
                  <div className="space-y-2 mb-3">
                    <div className="bg-red-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-red-500 font-medium mb-1">💢 VẤN ĐỀ</p>
                      <p className="text-xs text-red-800 whitespace-pre-line">{(script?.painPoint ?? '')?.replace?.(/\n/g, ' ')}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-emerald-500 font-medium mb-1">✅ GIẢI PHÁP</p>
                      <p className="text-xs text-emerald-800 whitespace-pre-line">{(script?.solution ?? '')?.replace?.(/\n/g, ' ')}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2.5">
                      <p className="text-[10px] text-purple-500 font-medium mb-1">📣 CTA</p>
                      <p className="text-xs text-purple-800 whitespace-pre-line">{(script?.cta ?? '')?.replace?.(/\n/g, ' ')}</p>
                    </div>
                    {script?.caption && (
                      <div className="bg-gray-50 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-500 font-medium mb-1">📝 KỊCH BẢN</p>
                        <p className="text-xs text-gray-700 whitespace-pre-line">{(script?.caption ?? '')?.replace?.(/\n/g, ' ')}</p>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex items-center gap-3 text-[10px] text-gray-500 mb-3">
                  <span className="flex items-center gap-1"><Clock size={10} />{(script?.duration ?? '')?.replace?.(/\n/g, '')}</span>
                  <span className="flex items-center gap-1"><Target size={10} />{(script?.expectedKpi ?? '')?.replace?.(/\n/g, ' ')?.slice?.(0, 30)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedScript(expandedScript === script?.scriptId ? null : script?.scriptId)}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200 transition font-medium"
                  >
                    {expandedScript === script?.scriptId ? 'Thu gọn' : 'Xem chi tiết'}
                  </button>
                  <button
                    onClick={() => updateStatus(script?.scriptId, 'Đã Dùng')}
                    className="px-3 py-1.5 text-xs bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition font-medium"
                  >
                    <Check size={12} className="inline mr-1" />Đã dùng
                  </button>
                  <button
                    onClick={() => updateStatus(script?.scriptId, 'Đã Lên Lịch')}
                    className="px-3 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition font-medium"
                  >
                    <CalendarIcon size={12} className="inline mr-1" />Lên lịch
                  </button>
                </div>
              </div>
            </div>
          )) ?? []}
          {(scripts ?? [])?.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-400">Không tìm thấy kịch bản nào với bộ lọc hiện tại</div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ngày</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tuần</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Chủ đề</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kênh</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Giờ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(calendar ?? [])?.map?.((item: any, i: number) => (
                  <tr key={item?.id ?? i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{item?.date ?? ''}</td>
                    <td className="px-4 py-3 text-xs">{item?.week ?? ''}</td>
                    <td className="px-4 py-3 text-xs">{item?.contentType ?? ''}</td>
                    <td className="px-4 py-3 text-xs max-w-[250px] truncate">{item?.topic ?? ''}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        (item?.channel ?? '') === 'Instagram' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-700'
                      }`}>{item?.channel ?? ''}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{item?.postTime ?? ''}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCalendarStatusColor(item?.status ?? '')}`}>
                        {item?.status ?? ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item?.notes ?? ''}</td>
                  </tr>
                )) ?? []}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
