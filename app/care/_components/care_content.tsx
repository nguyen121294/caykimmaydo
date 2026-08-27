'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Search,
  Phone,
  Mail,
  RefreshCw,
  Plus,
  Pencil,
  ShoppingCart,
  Tag,
  MapPin,
  Instagram,
  Sparkles,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Ban,
  ShoppingBag,
  UserCheck,
  Kanban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface CareItem {
  id: string;
  type: 'LEAD' | 'CUSTOMER';
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  contactAccount: string | null;
  address: string | null;
  estimatedValue: number;
  totalOrders: number;
  loyaltyTier: string | null;
  statusOrStage: string;
  lastCareOrPurchaseDate: string | null;
  nextDate: string | null;
  nextAction: string | null;
  noCare: boolean;
  notes: string | null;
  assignee: string | null;
  createdAt: string;
}

function clientErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
}

function getDaysDiff(targetDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function addDaysToDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CareContent() {
  const [items, setItems] = useState<CareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'CUSTOMER' | 'LEAD'>('all');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'due_today' | 'upcoming' | 'day15_care' | 'no_care'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit quick modal
  const [editingItem, setEditingItem] = useState<CareItem | null>(null);
  const [editNextDate, setEditNextDate] = useState('');
  const [editNextAction, setEditNextAction] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editNoCare, setEditNoCare] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/care');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      toast.error('Lỗi tải dữ liệu lịch hẹn & CSKH');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setQuickSchedule = async (item: CareItem, daysAhead: number, actionName: string) => {
    const targetDate = addDaysToDate(daysAhead);
    try {
      const res = await fetch('/api/care', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          nextDate: targetDate,
          nextAction: actionName,
          noCare: false,
        }),
      });
      if (!res.ok) throw new Error('Lỗi cập nhật lịch hẹn');
      setItems(prev => prev.map(i => (i.id === item.id && i.type === item.type) ? {
        ...i,
        nextDate: targetDate,
        nextAction: actionName,
        noCare: false,
      } : i));
      toast.success(`Đã hẹn vào ${targetDate} (+${daysAhead} ngày)`);
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    }
  };

  const toggleNoCare = async (item: CareItem) => {
    const newNoCare = !item.noCare;
    try {
      const res = await fetch('/api/care', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          type: item.type,
          noCare: newNoCare,
          ...(newNoCare ? { nextDate: null } : {}),
        }),
      });
      if (!res.ok) throw new Error('Lỗi cập nhật trạng thái');
      setItems(prev => prev.map(i => (i.id === item.id && i.type === item.type) ? {
        ...i,
        noCare: newNoCare,
        ...(newNoCare ? { nextDate: null } : {}),
      } : i));
      toast.success(newNoCare ? 'Đã bật cờ Dừng chăm sóc' : 'Đã mở lại chăm sóc');
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    }
  };

  const openEditModal = (item: CareItem) => {
    setEditingItem(item);
    setEditNextDate(item.nextDate || '');
    setEditNextAction(item.nextAction || '');
    setEditNotes(item.notes || '');
    setEditNoCare(item.noCare || false);
  };

  const handleSaveModal = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const res = await fetch('/api/care', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          type: editingItem.type,
          nextDate: editNextDate || null,
          nextAction: editNextAction || null,
          notes: editNotes || null,
          noCare: editNoCare,
        }),
      });
      if (!res.ok) throw new Error('Lỗi lưu lịch hẹn');
      toast.success('Đã cập nhật lịch hẹn chăm sóc thành công');
      setEditingItem(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Filtered Items
  const normalizedQuery = search.trim().toLowerCase();
  const filtered = items.filter(item => {
    const matchSearch = !normalizedQuery ||
      item.name?.toLowerCase().includes(normalizedQuery) ||
      (item.phone && item.phone.toLowerCase().includes(normalizedQuery)) ||
      (item.email && item.email.toLowerCase().includes(normalizedQuery)) ||
      (item.contactAccount && item.contactAccount.toLowerCase().includes(normalizedQuery)) ||
      (item.nextAction && item.nextAction.toLowerCase().includes(normalizedQuery)) ||
      (item.notes && item.notes.toLowerCase().includes(normalizedQuery)) ||
      (item.assignee && item.assignee.toLowerCase().includes(normalizedQuery)) ||
      (item.source && item.source.toLowerCase().includes(normalizedQuery));

    const matchType = typeFilter === 'all' || item.type === typeFilter;

    let matchSchedule = true;
    if (scheduleFilter === 'due_today') {
      matchSchedule = !item.noCare && !!item.nextDate && getDaysDiff(item.nextDate) <= 0;
    } else if (scheduleFilter === 'upcoming') {
      matchSchedule = !item.noCare && !!item.nextDate && getDaysDiff(item.nextDate) > 0 && getDaysDiff(item.nextDate) <= 7;
    } else if (scheduleFilter === 'day15_care') {
      matchSchedule = !item.noCare && !!item.lastCareOrPurchaseDate && getDaysDiff(item.lastCareOrPurchaseDate) <= -15 && !item.nextDate;
    } else if (scheduleFilter === 'no_care') {
      matchSchedule = item.noCare === true;
    }

    return matchSearch && matchType && matchSchedule;
  });

  // Sorted
  const sorted = [...filtered].sort((a, b) => {
    if (a.noCare && !b.noCare) return 1;
    if (!a.noCare && b.noCare) return -1;
    if (!a.nextDate && b.nextDate) return 1;
    if (a.nextDate && !b.nextDate) return -1;
    if (!a.nextDate && !b.nextDate) return 0;

    const diffA = getDaysDiff(a.nextDate!);
    const diffB = getDaysDiff(b.nextDate!);
    return sortOrder === 'asc' ? diffA - diffB : diffB - diffA;
  });

  // KPIs
  const dueTodayCount = items.filter(i => !i.noCare && i.nextDate && getDaysDiff(i.nextDate) <= 0).length;
  const upcomingCount = items.filter(i => !i.noCare && i.nextDate && getDaysDiff(i.nextDate) > 0 && getDaysDiff(i.nextDate) <= 7).length;
  const day15CareCount = items.filter(i => !i.noCare && i.lastCareOrPurchaseDate && getDaysDiff(i.lastCareOrPurchaseDate) <= -15 && !i.nextDate).length;
  const customerCount = items.filter(i => i.type === 'CUSTOMER').length;
  const leadCount = items.filter(i => i.type === 'LEAD').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={28} /> Trung Tâm Lịch Hẹn &amp; Chăm Sóc Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Hợp nhất toàn bộ lịch hẹn tư vấn từ <strong>Sales Pipeline</strong> và lịch chăm sóc tái mua từ <strong>CRM</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5 font-medium transition-colors">
            <RefreshCw size={14} /> Làm mới
          </button>
          <a href="/sales" className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm flex items-center gap-1.5 font-medium transition-colors">
            <Kanban size={14} /> Xem Sales Pipeline
          </a>
          <a href="/crm" className="px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm flex items-center gap-1.5 font-medium transition-colors">
            <UserCheck size={14} /> Xem CRM Khách Hàng
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => { setScheduleFilter('due_today'); setTypeFilter('all'); }}
          className={`rounded-xl p-4 cursor-pointer transition-all border ${dueTodayCount > 0 ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider">Cần gọi hôm nay / Trễ</p>
            {dueTodayCount > 0 && <Flame size={14} className="text-red-500 animate-bounce" />}
          </div>
          <p className="text-2xl font-bold mt-1">{dueTodayCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">{dueTodayCount > 0 ? 'Ưu tiên gọi trước' : 'Không có việc trễ'}</p>
        </div>

        <div
          onClick={() => { setScheduleFilter('upcoming'); setTypeFilter('all'); }}
          className="rounded-xl p-4 bg-amber-50 text-amber-700 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-all"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Lịch hẹn 7 ngày tới</p>
          <p className="text-2xl font-bold mt-1">{upcomingCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Khách đã hẹn trước</p>
        </div>

        <div
          onClick={() => { setScheduleFilter('day15_care'); setTypeFilter('all'); }}
          className="rounded-xl p-4 bg-purple-50 text-purple-700 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-all"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Mua sau 15 ngày</p>
          <p className="text-2xl font-bold mt-1">{day15CareCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Chăm sóc mẫu vải mới</p>
        </div>

        <div
          onClick={() => { setTypeFilter('LEAD'); setScheduleFilter('all'); }}
          className="rounded-xl p-4 bg-blue-50 text-blue-700 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-all"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Từ Sales Pipeline</p>
          <p className="text-2xl font-bold mt-1">{leadCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Khách tiềm năng đang chốt</p>
        </div>

        <div
          onClick={() => { setTypeFilter('CUSTOMER'); setScheduleFilter('all'); }}
          className="rounded-xl p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-all"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Từ CRM (Khách cũ)</p>
          <p className="text-2xl font-bold mt-1">{customerCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Khách hàng thân thiết</p>
        </div>
      </div>

      {/* Type & Schedule Flow Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${typeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            Tất cả nguồn ({items.length})
          </button>
          <button
            onClick={() => setTypeFilter('CUSTOMER')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${typeFilter === 'CUSTOMER' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
          >
            <UserCheck size={13} /> Khách hàng CRM ({customerCount})
          </button>
          <button
            onClick={() => setTypeFilter('LEAD')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${typeFilter === 'LEAD' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
          >
            <Kanban size={13} /> Cơ hội Sales Pipeline ({leadCount})
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

          <button
            onClick={() => setScheduleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${scheduleFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            Mọi lịch hẹn
          </button>
          <button
            onClick={() => setScheduleFilter('due_today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${scheduleFilter === 'due_today' ? 'bg-red-600 text-white font-semibold' : 'text-red-700 hover:bg-red-50'}`}
          >
            <AlertTriangle size={12} /> Cần gọi hôm nay ({dueTodayCount})
          </button>
          <button
            onClick={() => setScheduleFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${scheduleFilter === 'upcoming' ? 'bg-amber-600 text-white font-semibold' : 'text-amber-700 hover:bg-amber-50'}`}
          >
            <Calendar size={12} /> 7 ngày tới ({upcomingCount})
          </button>
          <button
            onClick={() => setScheduleFilter('day15_care')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${scheduleFilter === 'day15_care' ? 'bg-purple-600 text-white font-semibold' : 'text-purple-700 hover:bg-purple-50'}`}
          >
            <ShoppingBag size={12} /> Mua sau 15 ngày ({day15CareCount})
          </button>
        </div>
      </div>

      {/* Search and Sort Indicator */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            placeholder="Tìm kiếm theo tên khách, SĐT, hành động hẹn, ghi chú, người phụ trách..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs text-slate-500">
          <span>Sắp xếp:</span>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 transition-colors"
          >
            Ngày hẹn CS ({sortOrder === 'asc' ? 'Gần nhất / Quá hạn trước' : 'Xa nhất trước'})
            {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          </button>
        </div>
      </div>

      {/* Unified Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Khách hàng &amp; Nguồn gốc</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Giá trị / Chi tiêu</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Lịch sử gần nhất</th>
                <th className="text-left px-4 py-3.5 font-semibold text-indigo-900 bg-indigo-50/70">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-indigo-600" />
                    <span>Lịch hẹn &amp; Hành động chăm sóc</span>
                  </div>
                </th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Ghi chú &amp; Phụ trách</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Đang tải trung tâm lịch hẹn &amp; CSKH...</td></tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-30" />
                    Không tìm thấy lịch hẹn hoặc khách hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                sorted.map(item => {
                  const daysDiff = item.nextDate ? getDaysDiff(item.nextDate) : null;
                  const isOverdue = daysDiff !== null && daysDiff < 0;
                  const isDueToday = daysDiff !== null && daysDiff === 0;
                  const isUpcoming = daysDiff !== null && daysDiff > 0 && daysDiff <= 7;

                  return (
                    <tr key={`${item.type}-${item.id}`} className={`hover:bg-slate-50/90 transition-colors ${item.noCare ? 'bg-slate-50/40 opacity-75' : ''}`}>
                      {/* Customer & Origin info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${item.type === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                            {item.type === 'CUSTOMER' ? 'CRM Khách cũ' : 'Sales Lead'}
                          </span>
                          {item.noCare && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold flex items-center gap-0.5">
                              <Ban size={9} /> Dừng CS
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.phone ? (
                            <span className="text-xs text-slate-700 font-medium flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {item.phone}</span>
                          ) : (
                            <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Chưa có SĐT</span>
                          )}
                          {item.contactAccount && (
                            <span className="text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                              <Instagram size={10} /> {item.contactAccount}
                            </span>
                          )}
                          {item.source && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">{item.source}</span>
                          )}
                        </div>

                        {item.address && (
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-xs" title={item.address}>
                            <MapPin size={10} className="shrink-0 text-slate-400" /> {item.address}
                          </p>
                        )}
                      </td>

                      {/* Value / Total Spent */}
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        <p className="text-emerald-600 font-bold">{fmt(item.estimatedValue)}</p>
                        <div className="flex items-center gap-1 text-[11px] font-normal text-slate-500 mt-0.5">
                          <span>{item.type === 'CUSTOMER' ? `Đã mua ${item.totalOrders} đơn` : `Trạng thái: ${item.statusOrStage}`}</span>
                          {item.loyaltyTier && (
                            <span className="font-semibold text-purple-600 bg-purple-50 px-1 rounded">({item.loyaltyTier})</span>
                          )}
                        </div>
                      </td>

                      {/* Last history */}
                      <td className="px-4 py-3.5">
                        {item.lastCareOrPurchaseDate ? (
                          <div>
                            <p className="font-medium text-slate-800 text-xs">{item.lastCareOrPurchaseDate}</p>
                            <span className="text-[10px] text-slate-500">
                              {Math.abs(getDaysDiff(item.lastCareOrPurchaseDate))} ngày trước
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Khách mới</span>
                        )}
                      </td>

                      {/* Follow-up schedule & Action */}
                      <td className="px-4 py-3.5 bg-indigo-50/30">
                        {item.noCare ? (
                          <div className="space-y-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium inline-flex items-center gap-1">
                              <Ban size={10} /> Đã dừng chăm sóc
                            </span>
                            <button
                              onClick={() => toggleNoCare(item)}
                              className="text-[10px] text-indigo-600 hover:underline block"
                            >
                              Mở lại chăm sóc
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {item.nextDate ? (
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                                isDueToday
                                  ? 'bg-red-500 text-white border-red-500 animate-pulse'
                                  : isOverdue
                                  ? 'bg-red-50 text-red-700 border-red-300'
                                  : isUpcoming
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-medium'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                <Calendar size={11} />
                                {isDueToday ? '🚨 Hôm nay cần gọi' : isOverdue ? `⚠️ Quá hạn ${Math.abs(daysDiff!)} ngày (${item.nextDate})` : `Còn ${daysDiff} ngày (${item.nextDate})`}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={11} /> Chưa hẹn lịch</span>
                            )}

                            {item.nextAction && (
                              <p className="text-xs text-indigo-700 font-medium bg-indigo-50 rounded px-1.5 py-0.5 border border-indigo-100">
                                🎯 {item.nextAction}
                              </p>
                            )}

                            {/* 1-Click Quick Follow-up Buttons */}
                            <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400">Hẹn:</span>
                              <button
                                onClick={() => setQuickSchedule(item, 3, 'Fit Check đồ may (3 ngày)')}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
                                title="Hẹn sau 3 ngày: Hỏi vừa vặn đồ may"
                              >
                                +3d
                              </button>
                              <button
                                onClick={() => setQuickSchedule(item, 7, 'Hỏi thăm phản hồi (7 ngày)')}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
                                title="Hẹn sau 7 ngày: Hỏi thăm lại"
                              >
                                +7d
                              </button>
                              <button
                                onClick={() => setQuickSchedule(item, 15, 'Chăm sóc mẫu vải mới (15 ngày)')}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
                                title="Hẹn sau 15 ngày: Chăm sóc vải mới sau 2 tuần"
                              >
                                +15d
                              </button>
                              <button
                                onClick={() => setQuickSchedule(item, 30, 'Tái may chu kỳ tháng sau (30 ngày)')}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 transition-colors"
                                title="Hẹn sau 30 ngày: Tái may"
                              >
                                +30d
                              </button>
                              <button
                                onClick={() => toggleNoCare(item)}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-red-50 hover:text-red-600 text-slate-400 border border-slate-200 transition-colors"
                                title="Dừng chăm sóc khách này"
                              >
                                🚫
                              </button>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Notes & Assignee */}
                      <td className="px-4 py-3.5 max-w-xs">
                        {item.assignee && (
                          <p className="text-xs font-semibold text-slate-700">Sale: {item.assignee}</p>
                        )}
                        {item.notes ? (
                          <p className="text-xs text-slate-500 mt-0.5 truncate" title={item.notes}>{item.notes}</p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Không có ghi chú</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                            title="Sửa chi tiết lịch hẹn & ghi chú"
                          >
                            <Pencil size={12} className="text-indigo-600" /> Sửa
                          </button>
                          <a
                            href={`/orders?customerName=${encodeURIComponent(item.name)}&phone=${encodeURIComponent(item.phone || '')}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition-colors"
                            title="Tạo đơn hàng mới cho khách này"
                          >
                            <ShoppingCart size={12} /> Tạo đơn
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Quick Edit Care Modal ===== */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" /> Lịch Hẹn &amp; CSKH — {editingItem.name}
              </h2>
              <button aria-label="Đóng" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Trạng thái chăm sóc:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={editNoCare} onChange={e => setEditNoCare(e.target.checked)} className="rounded text-indigo-600" />
                  <span>Dừng chăm sóc</span>
                </label>
              </div>

              {!editNoCare && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hẹn liên hệ tiếp theo</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" value={editNextDate} onChange={e => setEditNextDate(e.target.value)} />
                  </div>

                  {/* Quick Pick Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500">Chọn nhanh:</span>
                    <button type="button" onClick={() => { setEditNextDate(addDaysToDate(3)); setEditNextAction('Fit Check đồ may (3 ngày)'); }} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded hover:bg-indigo-50 hover:text-indigo-600">+3d</button>
                    <button type="button" onClick={() => { setEditNextDate(addDaysToDate(7)); setEditNextAction('Hỏi thăm phản hồi (7 ngày)'); }} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded hover:bg-indigo-50 hover:text-indigo-600">+7d</button>
                    <button type="button" onClick={() => { setEditNextDate(addDaysToDate(15)); setEditNextAction('Chăm sóc mẫu vải mới (15 ngày)'); }} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded hover:bg-indigo-50 hover:text-indigo-600">+15d</button>
                    <button type="button" onClick={() => { setEditNextDate(addDaysToDate(30)); setEditNextAction('Tái may chu kỳ tháng sau (30 ngày)'); }} className="text-[10px] px-2 py-0.5 bg-slate-100 rounded hover:bg-indigo-50 hover:text-indigo-600">+30d</button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động cần làm</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: Gửi mẫu vải mới, Fit check..." value={editNextAction} onChange={e => setEditNextAction(e.target.value)} />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú kết quả cuộc gọi / tư vấn</label>
                <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" rows={3} placeholder="Ghi chú sở thích, phản hồi của khách..." value={editNotes} onChange={e => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Hủy</button>
              <button onClick={handleSaveModal} disabled={saving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {saving ? 'Đang lưu...' : 'Lưu lịch hẹn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
