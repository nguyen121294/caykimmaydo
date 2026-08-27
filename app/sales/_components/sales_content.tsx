'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Kanban,
  Link2,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  User,
  X,
  Instagram,
  Sparkles,
  ChevronRight,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: string;
  value: number;
  assignee: string | null;
  nextAction: string | null;
  nextDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface LeadImportPreview {
  totalRows: number;
  validLeads: number;
  newLeads: number;
  duplicateLeads: number;
  repeatedInSheet: number;
  invalidRows: number;
  skippedEmpty: number;
  duplicateSample: Array<{ rowNumber: number; name: string; phone: string }>;
  invalidSample: Array<{ rowNumber: number; reason: string }>;
}

interface LeadImportResult {
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  sheetUsed: string;
}

const stages = [
  { key: 'Mới', label: 'Mới', color: 'bg-blue-500 text-blue-700', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'Đang tư vấn', label: 'Đang tư vấn', color: 'bg-amber-500 text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'Hẹn liên hệ', label: 'Hẹn liên hệ lại', color: 'bg-purple-500 text-purple-700', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'Chốt đơn', label: 'Chốt đơn (Đã mua)', color: 'bg-emerald-600 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'Thua', label: 'Không phản hồi / Thua', color: 'bg-red-500 text-red-700', badge: 'bg-red-50 text-red-700 border-red-200' },
];

const sourceOptions = ['Instagram', 'Facebook', 'TikTok', 'Zalo', 'Google', 'Giới thiệu', 'Khác'];
const instagramPresets = ['@maydo.official', '@maydo.hn', '@maydo.sg', '@maydo.studio'];

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

export default function SalesContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('all_active');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'due_today' | 'upcoming' | 'no_schedule'>('all');

  // Add modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Instagram',
    stage: 'Mới',
    value: '',
    assignee: '',
    nextAction: '',
    nextDate: '',
    notes: ''
  });

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Instagram',
    stage: 'Mới',
    value: '',
    assignee: '',
    nextAction: '',
    nextDate: '',
    notes: ''
  });

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleSheetNames, setGoogleSheetNames] = useState<string[]>([]);
  const [googleSheetName, setGoogleSheetName] = useState('');
  const [importStartRow, setImportStartRow] = useState('2');
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<LeadImportPreview | null>(null);
  const [importResult, setImportResult] = useState<LeadImportResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      if (res.ok) setLeads(await res.json());
    } catch { toast.error('Lỗi tải dữ liệu'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng / lead'); return; }
    setAddSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          value: parseFloat(form.value) || 0
        })
      });
      if (res.ok) {
        toast.success('Thêm cơ hội bán hàng thành công & đồng bộ CRM');
        setShowAdd(false);
        setForm({ name: '', phone: '', email: '', source: 'Instagram', stage: 'Mới', value: '', assignee: '', nextAction: '', nextDate: '', notes: '' });
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi thêm lead');
      }
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditId(lead.id);
    setEditForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      source: lead.source || 'Instagram',
      stage: lead.stage || 'Mới',
      value: lead.value ? String(lead.value) : '',
      assignee: lead.assignee || '',
      nextAction: lead.nextAction || '',
      nextDate: lead.nextDate || '',
      notes: lead.notes || ''
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editForm.name.trim()) { toast.error('Vui lòng nhập tên khách hàng / lead'); return; }
    setEditSaving(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editId,
          ...editForm,
          value: parseFloat(editForm.value) || 0
        })
      });
      if (res.ok) {
        toast.success('Cập nhật cơ hội bán hàng thành công & đồng bộ CRM');
        setShowEdit(false);
        setEditId(null);
        fetchData();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi cập nhật lead');
      }
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    } finally {
      setEditSaving(false);
    }
  };

  const moveStage = async (id: string, newStage: string) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage })
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
      toast.success(`Đã chuyển sang ${newStage} (Đồng bộ CRM)`);
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const setQuickFollowUp = async (leadId: string, daysAhead: number, actionName: string) => {
    const targetDate = addDaysToDate(daysAhead);
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          nextDate: targetDate,
          nextAction: actionName,
          stage: 'Hẹn liên hệ',
        })
      });
      setLeads(prev => prev.map(l => l.id === leadId ? {
        ...l,
        nextDate: targetDate,
        nextAction: actionName,
        stage: 'Hẹn liên hệ',
      } : l));
      toast.success(`Đã đặt lịch hẹn vào ${targetDate} (+${daysAhead} ngày)`);
    } catch {
      toast.error('Lỗi đặt lịch hẹn');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa lead này?')) return;
    try {
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        toast.success('Đã xóa lead');
        setLeads(prev => prev.filter(l => l.id !== id));
      }
    } catch {
      toast.error('Lỗi xóa lead');
    }
  };

  // Google sheet imports
  const loadGoogleSheetNames = async () => {
    if (!googleSheetUrl.trim()) { toast.error('Vui lòng dán link Google Sheet'); return; }
    setSheetListLoading(true);
    setImportError(null);
    setGoogleSheetNames([]);
    setGoogleSheetName('');
    setImportPreview(null);
    setImportResult(null);
    try {
      const res = await fetch('/api/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetUrl: googleSheetUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể tải danh sách Sheet/Tab');
      setGoogleSheetNames(data.sheetNames);
      if (data.sheetNames.length === 1) setGoogleSheetName(data.sheetNames[0]);
      toast.success(`Đã tìm thấy ${data.sheetNames.length} Sheet/Tab`);
    } catch (error: unknown) {
      const message = clientErrorMessage(error);
      setImportError(message);
      toast.error(message);
    } finally {
      setSheetListLoading(false);
    }
  };

  const handleGoogleSheetImport = async (action: 'preview' | 'import') => {
    if (!googleSheetUrl.trim()) { toast.error('Vui lòng dán link Google Sheet'); return; }
    if (!googleSheetName) { toast.error('Vui lòng chọn đúng Sheet/Tab Sales'); return; }
    setImportLoading(true);
    setImportError(null);
    if (action === 'preview') {
      setImportPreview(null);
      setImportResult(null);
    }
    try {
      const res = await fetch('/api/sales/import-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          spreadsheetUrl: googleSheetUrl,
          sheetName: googleSheetName,
          startRow: importStartRow || '2',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Không thể import Google Sheet');
      if (action === 'preview') {
        setImportPreview(data.preview);
        toast.success('Đã kiểm tra dữ liệu Sales và lead trùng');
      } else {
        setImportResult(data);
        setImportPreview(null);
        toast.success(data.message);
        fetchData();
      }
    } catch (error: unknown) {
      const message = clientErrorMessage(error);
      setImportError(message);
      toast.error(message);
    } finally {
      setImportLoading(false);
    }
  };

  // Filtered Leads
  const normalizedQuery = search.trim().toLowerCase();
  const filteredLeads = leads.filter(lead => {
    // Search query
    const matchSearch = !normalizedQuery ||
      lead.name?.toLowerCase().includes(normalizedQuery) ||
      (lead.phone && lead.phone.toLowerCase().includes(normalizedQuery)) ||
      (lead.email && lead.email.toLowerCase().includes(normalizedQuery)) ||
      (lead.assignee && lead.assignee.toLowerCase().includes(normalizedQuery)) ||
      (lead.nextAction && lead.nextAction.toLowerCase().includes(normalizedQuery)) ||
      (lead.notes && lead.notes.toLowerCase().includes(normalizedQuery)) ||
      (lead.source && lead.source.toLowerCase().includes(normalizedQuery));

    // Stage filter
    let matchStage = true;
    if (selectedStage === 'all_active') {
      matchStage = lead.stage !== 'Chốt đơn' && lead.stage !== 'Thua';
    } else if (selectedStage !== 'all') {
      matchStage = lead.stage === selectedStage;
    }

    // Follow-up filter
    let matchFollowUp = true;
    if (followUpFilter === 'due_today') {
      if (!lead.nextDate) {
        matchFollowUp = false;
      } else {
        const diff = getDaysDiff(lead.nextDate);
        matchFollowUp = diff <= 0;
      }
    } else if (followUpFilter === 'upcoming') {
      if (!lead.nextDate) {
        matchFollowUp = false;
      } else {
        const diff = getDaysDiff(lead.nextDate);
        matchFollowUp = diff > 0 && diff <= 7;
      }
    } else if (followUpFilter === 'no_schedule') {
      matchFollowUp = !lead.nextDate && lead.stage !== 'Chốt đơn' && lead.stage !== 'Thua';
    }

    return matchSearch && matchStage && matchFollowUp;
  });

  // KPI Calculations
  const activeLeads = leads.filter(l => l.stage !== 'Chốt đơn' && l.stage !== 'Thua');
  const totalValue = leads.reduce((s, l) => s + (l.value || 0), 0);
  const wonLeads = leads.filter(l => l.stage === 'Chốt đơn');
  const wonValue = wonLeads.reduce((s, l) => s + (l.value || 0), 0);
  const dueTodayCount = leads.filter(l => l.nextDate && getDaysDiff(l.nextDate) <= 0 && l.stage !== 'Chốt đơn' && l.stage !== 'Thua').length;
  const upcomingCount = leads.filter(l => l.nextDate && getDaysDiff(l.nextDate) > 0 && getDaysDiff(l.nextDate) <= 7 && l.stage !== 'Chốt đơn' && l.stage !== 'Thua').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Kanban className="text-indigo-600" size={28} /> Sales Pipeline &amp; Chăm Sóc Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý cơ hội bán hàng dạng hàng ngang (Row View), lịch hẹn Follow-up &amp; đồng bộ CRM</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5 font-medium transition-colors">
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={() => { setShowImport(true); setImportError(null); setImportPreview(null); setImportResult(null); }} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5 font-medium transition-colors">
            <FileSpreadsheet size={14} /> Import Google Sheet
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5 font-medium shadow-sm transition-colors">
            <Plus size={14} /> Thêm cơ hội / Lead
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700 border border-blue-100">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Đang xử lý (Active)</p>
          <p className="text-2xl font-bold mt-1">{activeLeads.length}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Tổng {leads.length} cơ hội</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700 border border-purple-100">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Dự kiến doanh thu</p>
          <p className="text-xl font-bold mt-1">{fmt(totalValue)}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Tiềm năng pipeline</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700 border border-emerald-100">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Đã chốt đơn</p>
          <p className="text-xl font-bold mt-1 text-emerald-700">{fmt(wonValue)}</p>
          <p className="text-[11px] opacity-75 mt-0.5">{wonLeads.length} đơn thành công</p>
        </div>
        <div
          onClick={() => { setFollowUpFilter('due_today'); setSelectedStage('all_active'); }}
          className={`rounded-xl p-4 cursor-pointer transition-all border ${dueTodayCount > 0 ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider">Cần gọi hôm nay</p>
            {dueTodayCount > 0 && <Flame size={14} className="text-red-500 animate-bounce" />}
          </div>
          <p className="text-2xl font-bold mt-1">{dueTodayCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">{dueTodayCount > 0 ? 'Bấm để lọc danh sách' : 'Không có việc trễ'}</p>
        </div>
        <div
          onClick={() => { setFollowUpFilter('upcoming'); setSelectedStage('all_active'); }}
          className="rounded-xl p-4 bg-amber-50 text-amber-700 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-all"
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Lịch hẹn 7 ngày tới</p>
          <p className="text-2xl font-bold mt-1">{upcomingCount}</p>
          <p className="text-[11px] opacity-75 mt-0.5">Khách đã hẹn trước</p>
        </div>
      </div>

      {/* Stage Flow Tabs (Horizontal Progress Navigation) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedStage('all_active')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedStage === 'all_active' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            <Sparkles size={13} /> Đang xử lý ({activeLeads.length})
          </button>
          <button
            onClick={() => setSelectedStage('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${selectedStage === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
          >
            Tất cả ({leads.length})
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" />

          {stages.map(st => {
            const count = leads.filter(l => l.stage === st.key).length;
            const stageVal = leads.filter(l => l.stage === st.key).reduce((s, l) => s + (l.value || 0), 0);
            return (
              <button
                key={st.key}
                onClick={() => setSelectedStage(st.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${selectedStage === st.key ? `${st.badge} ring-2 ring-indigo-400 font-bold shadow-sm` : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
              >
                <div className={`w-2 h-2 rounded-full ${st.color.split(' ')[0]}`} />
                {st.label} ({count})
                {stageVal > 0 && <span className="text-[10px] opacity-75 font-normal">· {fmt(stageVal)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Follow-up Fast Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            placeholder="Tìm theo tên khách, SĐT, email, hành động hẹn, ghi chú, người phụ trách..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Quick Follow-up Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setFollowUpFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${followUpFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Tất cả hẹn
          </button>
          <button
            onClick={() => setFollowUpFilter('due_today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${followUpFilter === 'due_today' ? 'bg-red-600 text-white shadow-sm font-semibold' : 'text-red-700 hover:bg-red-50'}`}
          >
            <AlertTriangle size={12} /> Cần gọi hôm nay / Trễ ({dueTodayCount})
          </button>
          <button
            onClick={() => setFollowUpFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${followUpFilter === 'upcoming' ? 'bg-amber-600 text-white shadow-sm font-semibold' : 'text-amber-700 hover:bg-amber-50'}`}
          >
            <Calendar size={12} /> Sắp tới 7 ngày ({upcomingCount})
          </button>
          <button
            onClick={() => setFollowUpFilter('no_schedule')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${followUpFilter === 'no_schedule' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Chưa có lịch
          </button>
        </div>
      </div>

      {/* Horizontal Row-Based Pipeline Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Khách hàng &amp; Nguồn</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Giá trị dự kiến</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Giai đoạn Pipeline</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Lịch hẹn Follow-up &amp; Hành động</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Sale phụ trách &amp; Ghi chú</th>
                <th className="text-left px-4 py-3.5 font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Đang tải dữ liệu cơ hội bán hàng...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Kanban size={32} className="mx-auto mb-2 opacity-30" />
                    Không tìm thấy cơ hội bán hàng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredLeads.map(lead => {
                  const daysDiff = lead.nextDate ? getDaysDiff(lead.nextDate) : null;
                  const isOverdue = daysDiff !== null && daysDiff < 0;
                  const isDueToday = daysDiff !== null && daysDiff === 0;
                  const isUpcoming = daysDiff !== null && daysDiff > 0 && daysDiff <= 7;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* Customer info */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{lead.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.phone ? (
                            <span className="text-xs text-slate-600 flex items-center gap-1"><Phone size={11} className="text-slate-400" /> {lead.phone}</span>
                          ) : (
                            <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Chưa có SĐT</span>
                          )}
                          {lead.source && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              {lead.source.includes('@') && <Instagram size={10} className="text-purple-600" />} {lead.source}
                            </span>
                          )}
                        </div>
                        {lead.email && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Mail size={10} /> {lead.email}</p>}
                      </td>

                      {/* Value */}
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {lead.value > 0 ? (
                          <span className="text-emerald-600 font-bold">{fmt(lead.value)}</span>
                        ) : (
                          <span className="text-slate-400 text-xs font-normal">Chưa báo giá</span>
                        )}
                      </td>

                      {/* Stage Inline Selector */}
                      <td className="px-4 py-3.5">
                        <select
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold outline-none cursor-pointer ${stages.find(s => s.key === lead.stage)?.badge || 'bg-slate-100 text-slate-700'}`}
                          value={lead.stage}
                          onChange={e => moveStage(lead.id, e.target.value)}
                        >
                          {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                        </select>
                      </td>

                      {/* Follow-up status & Quick Schedule */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {lead.nextDate ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                                isDueToday
                                  ? 'bg-red-500 text-white border-red-500 animate-pulse'
                                  : isOverdue
                                  ? 'bg-red-50 text-red-700 border-red-300'
                                  : isUpcoming
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 font-medium'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                <Calendar size={11} />
                                {isDueToday ? '🚨 Hôm nay cần gọi' : isOverdue ? `⚠️ Quá hạn ${Math.abs(daysDiff!)} ngày (${lead.nextDate})` : `Còn ${daysDiff} ngày (${lead.nextDate})`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={11} /> Chưa hẹn lịch</span>
                          )}

                          {lead.nextAction && (
                            <p className="text-xs text-indigo-700 font-medium bg-indigo-50/70 rounded px-1.5 py-0.5 border border-indigo-100">
                              🎯 {lead.nextAction}
                            </p>
                          )}

                          {/* 1-Click Quick Follow-up Buttons */}
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="text-[10px] text-slate-400">Hẹn:</span>
                            <button
                              onClick={() => setQuickFollowUp(lead.id, 3, 'Fit Check đồ may (3 ngày)')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                              title="Hẹn sau 3 ngày: Hỏi vừa vặn đồ may"
                            >
                              +3d
                            </button>
                            <button
                              onClick={() => setQuickFollowUp(lead.id, 7, 'Hỏi thăm phản hồi (7 ngày)')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                              title="Hẹn sau 7 ngày: Hỏi thăm lại"
                            >
                              +7d
                            </button>
                            <button
                              onClick={() => setQuickFollowUp(lead.id, 15, 'Chăm sóc mẫu vải mới (15 ngày)')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                              title="Hẹn sau 15 ngày: Chăm sóc & giới thiệu vải mới"
                            >
                              +15d
                            </button>
                            <button
                              onClick={() => setQuickFollowUp(lead.id, 30, 'Tái may chu kỳ tháng sau (30 ngày)')}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors"
                              title="Hẹn sau 30 ngày: Chu kỳ may đồ mới"
                            >
                              +30d
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Assignee & Notes */}
                      <td className="px-4 py-3.5 max-w-xs">
                        {lead.assignee && (
                          <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <User size={11} className="text-slate-400" /> {lead.assignee}
                          </p>
                        )}
                        {lead.notes ? (
                          <p className="text-xs text-slate-500 mt-0.5 truncate" title={lead.notes}>{lead.notes}</p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Không có ghi chú</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEdit(lead)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                            title="Chỉnh sửa thông tin chi tiết"
                          >
                            <Pencil size={12} className="text-indigo-600" /> Sửa
                          </button>
                          <a
                            href={`/orders?customerName=${encodeURIComponent(lead.name)}&phone=${encodeURIComponent(lead.phone || '')}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition-colors"
                            title="Tạo đơn hàng chính thức từ cơ hội này"
                          >
                            <ShoppingCart size={12} /> Chốt
                          </a>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Xóa lead"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* ===== Add Lead Modal ===== */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> Thêm cơ hội bán hàng / Lead mới
              </h2>
              <button aria-label="Đóng" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên khách hàng / Lead *</label>
                <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: Chị Mai Hương" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: 0912345678" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá trị dự kiến (VNĐ)</label>
                  <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: 3500000" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
                </div>
              </div>

              {/* Source & Specific Instagram Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn khách</label>
                  <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giai đoạn ban đầu</label>
                  <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                    {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Instagram Quick Pick */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">Gợi ý acc Insta:</span>
                {instagramPresets.map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setForm({ ...form, source: acc })}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${form.source === acc ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>

              {/* Follow-up Section */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Calendar size={13} /> Lịch hẹn Follow-up &amp; Chăm sóc</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hẹn liên hệ lại</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={form.nextDate} onChange={e => setForm({...form, nextDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động cần làm</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" placeholder="VD: Gửi mẫu vải lụa mới" value={form.nextAction} onChange={e => setForm({...form, nextAction: e.target.value})} />
                  </div>
                </div>
                {/* Fast presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Chọn nhanh:</span>
                  <button type="button" onClick={() => setForm({ ...form, nextDate: addDaysToDate(3), nextAction: 'Fit Check đồ may (3 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+3 ngày (Fit check)</button>
                  <button type="button" onClick={() => setForm({ ...form, nextDate: addDaysToDate(7), nextAction: 'Hỏi thăm phản hồi (7 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+7 ngày</button>
                  <button type="button" onClick={() => setForm({ ...form, nextDate: addDaysToDate(15), nextAction: 'Chăm sóc mẫu vải mới (15 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+15 ngày (Vải mới)</button>
                  <button type="button" onClick={() => setForm({ ...form, nextDate: addDaysToDate(30), nextAction: 'Tái may chu kỳ tháng sau (30 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+30 ngày (Tái may)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="email@gmail.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân viên phụ trách</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: Linh Sale" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú tư vấn</label>
                <textarea className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" rows={2} placeholder="Nhu cầu may, phom dáng, số đo..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Hủy</button>
              <button onClick={handleAdd} disabled={addSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {addSaving ? 'Đang thêm...' : 'Thêm cơ hội'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Lead Modal ===== */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil size={18} className="text-indigo-600" /> Chỉnh sửa cơ hội bán hàng
              </h2>
              <button aria-label="Đóng" onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên khách hàng / Lead *</label>
                <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: Chị Mai Hương" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: 0912345678" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giá trị dự kiến (VNĐ)</label>
                  <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: 3500000" value={editForm.value} onChange={e => setEditForm({...editForm, value: e.target.value})} />
                </div>
              </div>

              {/* Source & Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn khách</label>
                  <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500" value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})}>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Giai đoạn Pipeline</label>
                  <select className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500" value={editForm.stage} onChange={e => setEditForm({...editForm, stage: e.target.value})}>
                    {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Instagram Quick Pick */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">Gợi ý acc Insta:</span>
                {instagramPresets.map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, source: acc })}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${editForm.source === acc ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>

              {/* Follow-up Section */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2.5">
                <p className="text-xs font-bold text-indigo-900 flex items-center gap-1"><Calendar size={13} /> Lịch hẹn Follow-up &amp; Chăm sóc</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày hẹn liên hệ lại</label>
                    <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={editForm.nextDate} onChange={e => setEditForm({...editForm, nextDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hành động cần làm</label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" placeholder="VD: Gửi bảng vải lụa mới" value={editForm.nextAction} onChange={e => setEditForm({...editForm, nextAction: e.target.value})} />
                  </div>
                </div>
                {/* Fast presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500">Chọn nhanh:</span>
                  <button type="button" onClick={() => setEditForm({ ...editForm, nextDate: addDaysToDate(3), nextAction: 'Fit Check đồ may (3 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+3 ngày (Fit check)</button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, nextDate: addDaysToDate(7), nextAction: 'Hỏi thăm phản hồi (7 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+7 ngày</button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, nextDate: addDaysToDate(15), nextAction: 'Chăm sóc mẫu vải mới (15 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+15 ngày (Vải mới)</button>
                  <button type="button" onClick={() => setEditForm({ ...editForm, nextDate: addDaysToDate(30), nextAction: 'Tái may chu kỳ tháng sau (30 ngày)' })} className="text-[10px] px-2 py-0.5 bg-white rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50">+30 ngày (Tái may)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="email@gmail.com" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhân viên phụ trách</label>
                  <input className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="VD: Linh Sale" value={editForm.assignee} onChange={e => setEditForm({...editForm, assignee: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú tư vấn</label>
                <textarea className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:border-indigo-500" rows={2} placeholder="Nhu cầu may, phom dáng, số đo..." value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Hủy</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Import Google Sheet Modal ===== */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-green-600" /> Import Sales từ Google Sheet
              </h2>
              <button aria-label="Đóng" onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="sales-google-sheet-url" className="text-sm font-medium text-slate-700 mb-1.5 block">Link Google Sheet công khai</label>
                <div className="relative">
                  <Link2 size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    id="sales-google-sheet-url"
                    type="url"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm outline-none focus:border-indigo-500"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                    value={googleSheetUrl}
                    onChange={e => { setGoogleSheetUrl(e.target.value); setGoogleSheetNames([]); setGoogleSheetName(''); setImportPreview(null); setImportResult(null); setImportError(null); }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Có thể dùng cùng link với CRM; chọn tab Sales ở bước kế tiếp.</p>
                <button
                  type="button"
                  onClick={loadGoogleSheetNames}
                  disabled={sheetListLoading || !googleSheetUrl.trim()}
                  className="mt-3 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {sheetListLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  {sheetListLoading ? 'Đang tải danh sách...' : 'Tải danh sách Sheet/Tab'}
                </button>
              </div>

              {googleSheetNames.length > 0 && (
                <div>
                  <label htmlFor="sales-google-sheet-name" className="text-sm font-medium text-slate-700 mb-1.5 block">Chọn đúng Sheet/Tab Sales</label>
                  <select
                    id="sales-google-sheet-name"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500"
                    value={googleSheetName}
                    onChange={e => { setGoogleSheetName(e.target.value); setImportPreview(null); setImportResult(null); }}
                  >
                    <option value="">-- Chọn tab Sales Pipeline --</option>
                    {googleSheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="sales-import-start-row" className="text-sm font-medium text-slate-700 mb-1 block">Dữ liệu bắt đầu từ hàng</label>
                <input
                  id="sales-import-start-row"
                  type="number"
                  min="1"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-indigo-500"
                  value={importStartRow}
                  onChange={e => { setImportStartRow(e.target.value); setImportPreview(null); }}
                />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              {importPreview && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Kết quả kiểm tra trước khi import</p>
                    <p className="text-xs text-blue-700 mt-0.5">Tìm thấy {importPreview.validLeads} lead hợp lệ từ {importPreview.totalRows} dòng dữ liệu.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Lead mới</p><p className="text-lg font-bold text-emerald-600">{importPreview.newLeads}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng hệ thống</p><p className="text-lg font-bold text-amber-600">{importPreview.duplicateLeads}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng trong Sheet</p><p className="text-lg font-bold text-amber-600">{importPreview.repeatedInSheet}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Không hợp lệ</p><p className="text-lg font-bold text-red-600">{importPreview.invalidRows}</p></div>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-1">
                  <p className="text-sm font-semibold text-green-900">{importResult.message}</p>
                  <p className="text-xs text-green-700">Đã cập nhật cơ hội bán hàng vào Sales Pipeline thành công.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium">Đóng</button>
              {importPreview ? (
                <button
                  onClick={() => handleGoogleSheetImport('import')}
                  disabled={importLoading || importPreview.validLeads === 0}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  {importLoading ? 'Đang import...' : `Xác nhận import ${importPreview.validLeads} lead`}
                </button>
              ) : (
                <button
                  onClick={() => handleGoogleSheetImport('preview')}
                  disabled={importLoading || !googleSheetUrl.trim() || !googleSheetName}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {importLoading ? 'Đang kiểm tra...' : 'Kiểm tra trùng'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
