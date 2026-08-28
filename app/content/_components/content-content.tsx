'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  Film,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  BookOpen,
  Send,
  Video,
  Layers,
  Filter,
  CheckCircle2,
  Clock3,
  CircleDashed,
} from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

interface VideoScriptItem {
  id?: string;
  scriptId: string;
  funnelStage: string;
  contentType: string;
  hook?: string | null;
  painPoint?: string | null;
  solution?: string | null;
  cta?: string | null;
  caption?: string | null;
  duration?: string | null;
  targetAudience?: string | null;
  expectedKpi?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CalendarItem {
  id: string;
  date: string;
  week?: string | null;
  contentType?: string | null;
  topic?: string | null;
  channel?: string | null;
  postTime?: string | null;
  orderRef?: string | null;
  status: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface FormulaStep {
  stepNumber: number;
  name: string;
  duration: string;
  importance: string;
  goal: string;
  principles: string[];
  dos: string[];
  donts: string[];
  examples: string[];
}

const FUNNEL_STAGES = [
  { id: 'TOF', label: '🔵 TOF - Nhận biết', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { id: 'MOF', label: '🟠 MOF - Nuôi dưỡng', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'BOF', label: '🟢 BOF - Chốt đơn', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

const STATUS_OPTIONS = [
  { id: 'Chưa Dùng', label: '⚪ Chưa Dùng', activeColor: 'bg-slate-700 text-white' },
  { id: 'Đã Lên Lịch', label: '🟡 Đã Lên Lịch', activeColor: 'bg-amber-600 text-white' },
  { id: 'Đã Dùng', label: '🟢 Đã Dùng', activeColor: 'bg-emerald-600 text-white' },
];

const PILLAR_CHIPS = [
  'BEFORE-AFTER',
  'PROBLEM-SOLUTION',
  'PINTEREST',
  'BODY TYPE',
  'TESTIMONIAL',
  'PROCESS',
  'FAQ',
  'BEHIND',
  'COMPARISON',
  'STYLING',
  'URGENCY',
  'DISCOUNT',
  'FOMO',
];

export default function ContentContent() {
  const [activeTab, setActiveTab] = useState<'scripts' | 'calendar' | 'formulas'>('scripts');
  const [scripts, setScripts] = useState<VideoScriptItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [formulas, setFormulas] = useState<FormulaStep[]>([]);
  const [stats, setStats] = useState({
    totalScripts: 0,
    tofCount: 0,
    mofCount: 0,
    bofCount: 0,
    calendarCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters (Button Pills)
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPillar, setSelectedPillar] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI States
  const [expandedScriptId, setExpandedScriptId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Script State
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<VideoScriptItem | null>(null);
  const [scriptFormData, setScriptFormData] = useState({
    scriptId: '',
    funnelStage: 'TOF',
    contentType: 'BEFORE-AFTER',
    hook: '',
    painPoint: '',
    solution: '',
    cta: '',
    caption: '',
    duration: '15-30s',
    targetAudience: 'Khách hàng nữ 20-35 tuổi',
    expectedKpi: 'Save Rate > 3%',
    status: 'Chưa Dùng',
  });

  // Modal Calendar State
  const [isCalModalOpen, setIsCalModalOpen] = useState(false);
  const [editingCal, setEditingCal] = useState<CalendarItem | null>(null);
  const [calFormData, setCalFormData] = useState({
    id: '',
    date: '',
    week: 'Tuần 1',
    contentType: 'Before – After',
    topic: '',
    channel: 'Instagram',
    postTime: '20:00',
    status: '📝 Chưa Làm',
    notes: '',
  });

  // Delete State
  const [deletingItem, setDeletingItem] = useState<{ type: 'script' | 'calendar'; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedStage) params.set('stage', selectedStage);
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedPillar) params.set('pillar', selectedPillar);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/content?${params.toString()}`);
      const json = await res.json();
      if (json) {
        setScripts(json.scripts ?? []);
        setCalendar(json.calendar ?? []);
        setFormulas(json.formulas ?? []);
        if (json.stats) setStats(json.stats);
      }
    } catch {
      toast.error('Không thể tải dữ liệu nội dung');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedStage, selectedStatus, selectedPillar, searchQuery]);

  // Quick 1-click status update
  const handleQuickStatusChange = async (scriptId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Đã cập nhật trạng thái ${scriptId} ➔ ${newStatus}`);
      fetchData();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  // Quick 1-click status update for calendar
  const handleCalStatusChange = async (calendarId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Đã cập nhật trạng thái lịch đăng!`);
      fetchData();
    } catch {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const copyFullScript = async (script: VideoScriptItem) => {
    try {
      const text = `🎬 [${script.funnelStage}] ${script.scriptId} - ${script.contentType}
⏱️ Thời lượng: ${script.duration || '15-30s'} | 🎯 KPI: ${script.expectedKpi || 'N/A'}

🎣 HOOK:
${script.hook || ''}

💢 VẤN ĐỀ (PAIN POINT):
${script.painPoint || ''}

✅ GIẢI PHÁP (SOLUTION):
${script.solution || ''}

📣 CALL-TO-ACTION (CTA):
${script.cta || ''}

${script.caption ? `📝 KỊCH BẢN CHI TIẾT:\n${script.caption}` : ''}`;

      await navigator.clipboard.writeText(text);
      setCopiedId(script.scriptId);
      toast.success(`Đã sao chép kịch bản ${script.scriptId}!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Không thể sao chép');
    }
  };

  // Open Add Modal
  const handleOpenAddScript = () => {
    setEditingScript(null);
    setScriptFormData({
      scriptId: `SCRIPT-${Date.now().toString().slice(-4)}`,
      funnelStage: selectedStage || 'TOF',
      contentType: selectedPillar || 'BEFORE-AFTER',
      hook: '',
      painPoint: '',
      solution: '',
      cta: '',
      caption: '',
      duration: '15-30s',
      targetAudience: 'Khách hàng nữ 20-35 tuổi',
      expectedKpi: 'Save Rate > 3%',
      status: 'Chưa Dùng',
    });
    setIsScriptModalOpen(true);
  };

  const handleOpenEditScript = (script: VideoScriptItem) => {
    setEditingScript(script);
    setScriptFormData({
      scriptId: script.scriptId,
      funnelStage: script.funnelStage || 'TOF',
      contentType: script.contentType || 'BEFORE-AFTER',
      hook: script.hook || '',
      painPoint: script.painPoint || '',
      solution: script.solution || '',
      cta: script.cta || '',
      caption: script.caption || '',
      duration: script.duration || '15-30s',
      targetAudience: script.targetAudience || '',
      expectedKpi: script.expectedKpi || '',
      status: script.status || 'Chưa Dùng',
    });
    setIsScriptModalOpen(true);
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptFormData.scriptId.trim() || !scriptFormData.hook.trim()) {
      toast.error('Vui lòng nhập Mã kịch bản và Hook');
      return;
    }
    try {
      setSaving(true);
      const method = editingScript ? 'PUT' : 'POST';
      const res = await fetch('/api/content', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'script', ...scriptFormData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại');
      toast.success(editingScript ? 'Cập nhật kịch bản thành công!' : 'Thêm kịch bản mới thành công!');
      setIsScriptModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  // Calendar Modal Handlers
  const handleOpenAddCal = () => {
    setEditingCal(null);
    setCalFormData({
      id: '',
      date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      week: 'Tuần 1',
      contentType: 'Before – After',
      topic: '',
      channel: 'Instagram',
      postTime: '20:00',
      status: '📝 Chưa Làm',
      notes: '',
    });
    setIsCalModalOpen(true);
  };

  const handleOpenEditCal = (cal: CalendarItem) => {
    setEditingCal(cal);
    setCalFormData({
      id: cal.id,
      date: cal.date || '',
      week: cal.week || 'Tuần 1',
      contentType: cal.contentType || 'Before – After',
      topic: cal.topic || '',
      channel: cal.channel || 'Instagram',
      postTime: cal.postTime || '20:00',
      status: cal.status || '📝 Chưa Làm',
      notes: cal.notes || '',
    });
    setIsCalModalOpen(true);
  };

  const handleSaveCal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calFormData.date.trim() || !calFormData.topic.trim()) {
      toast.error('Vui lòng nhập Ngày và Chủ đề');
      return;
    }
    try {
      setSaving(true);
      const method = editingCal ? 'PUT' : 'POST';
      const res = await fetch('/api/content', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'calendar', ...calFormData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Thao tác thất bại');
      toast.success(editingCal ? 'Cập nhật lịch đăng thành công!' : 'Thêm lịch đăng mới thành công!');
      setIsCalModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/content?type=${deletingItem.type}&id=${deletingItem.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      toast.success(`Đã xóa ${deletingItem.name}`);
      setDeletingItem(null);
      fetchData();
    } catch {
      toast.error('Lỗi khi xóa mục này');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStageColor = (stage: string) => {
    if (stage === 'TOF') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (stage === 'MOF') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (stage === 'BOF') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getCalendarStatusColor = (s: string) => {
    if (s?.includes('Đã Đăng') || s?.includes('Hoàn thành'))
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (s?.includes('Đang') || s?.includes('Lên Lịch'))
      return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Kho Nội Dung & Video Ads"
          description="32 Kịch bản video phễu quảng cáo, Lịch đăng 30 ngày & Công thức viết script chuẩn"
          icon={Film}
          onRefresh={fetchData}
        />
        <div className="flex items-center gap-2">
          {activeTab === 'scripts' ? (
            <button
              onClick={handleOpenAddScript}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition active:scale-95"
            >
              <Plus size={18} className="stroke-[2.5]" />
              <span>Thêm Video Script</span>
            </button>
          ) : activeTab === 'calendar' ? (
            <button
              onClick={handleOpenAddCal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition active:scale-95"
            >
              <Plus size={18} className="stroke-[2.5]" />
              <span>Thêm Lịch Đăng</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* 4 Thống kê Tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Kịch Bản
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
              <Film className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 font-display">{stats.totalScripts}</p>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              video 3 tầng phễu
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              🔵 TOF (Nhận Biết)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
              <Video className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-blue-600 font-display">{stats.tofCount}</p>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Hook & Before-After
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              🟠 MOF (Nuôi Dưỡng)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-amber-600 font-display">{stats.mofCount}</p>
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Testimonial & Process
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              🟢 BOF (Chốt Đơn)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-600 font-display">{stats.bofCount}</p>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              Offer & Social Proof
            </span>
          </div>
        </div>
      </div>

      {/* 3 Chế Độ Xem (Tabs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('scripts')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'scripts'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Film size={16} />
          <span>Kho Kịch Bản Video ({stats.totalScripts})</span>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'calendar'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <CalendarIcon size={16} />
          <span>Lịch Đăng 30 Ngày ({stats.calendarCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('formulas')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition ${
            activeTab === 'formulas'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          <Sparkles size={16} />
          <span>Công Thức Kịch Bản Vàng (6 Bước)</span>
        </button>
      </div>

      {/* Bộ Lọc 2 Hàng NÚT BẤM (Dành cho Tab Video Scripts & Lịch Đăng) */}
      {activeTab !== 'formulas' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3.5">
          {/* Thanh Tìm Kiếm */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'scripts'
                  ? 'Tìm kiếm theo Hook, Vấn đề, Giải pháp, Mã kịch bản (TOF-01, BOF-03)...'
                  : 'Tìm kiếm lịch theo chủ đề, ngày, kênh, định dạng...'
              }
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* HÀNG 1: Nút Tầng Phễu (Funnel Stage Pills) */}
          {activeTab === 'scripts' && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Tầng Phễu (Funnel Stage):
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedStage('')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedStage === ''
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  Tất cả ({stats.totalScripts})
                </button>
                {FUNNEL_STAGES.map(f => {
                  const isActive = selectedStage === f.id;
                  const count =
                    f.id === 'TOF'
                      ? stats.tofCount
                      : f.id === 'MOF'
                      ? stats.mofCount
                      : stats.bofCount;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedStage(isActive ? '' : f.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        isActive
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : `${f.color} hover:opacity-80`
                      }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-purple-800 text-white' : 'bg-white/80'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* HÀNG 2: Nút Trạng Thái & Thể Loại Content Pillar */}
          {activeTab === 'scripts' && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                {/* Trạng thái */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Trạng thái:
                  </span>
                  <button
                    onClick={() => setSelectedStatus('')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedStatus === ''
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả
                  </button>
                  {STATUS_OPTIONS.map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStatus(selectedStatus === st.id ? '' : st.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        selectedStatus === st.id
                          ? st.activeColor
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thể loại Content Pillar Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Định dạng:
                </span>
                <button
                  onClick={() => setSelectedPillar('')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                    selectedPillar === ''
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả định dạng
                </button>
                {PILLAR_CHIPS.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPillar(selectedPillar === p ? '' : p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                      selectedPillar === p
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: KHO KỊCH BẢN VIDEO */}
      {activeTab === 'scripts' && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-500">Đang tải kịch bản video...</p>
            </div>
          ) : scripts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h4 className="text-base font-semibold text-slate-800 mb-1">
                Không tìm thấy kịch bản nào
              </h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                Thử thay đổi bộ lọc tầng phễu, trạng thái hoặc từ khóa tìm kiếm
              </p>
              <button
                onClick={handleOpenAddScript}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
              >
                <Plus size={16} />
                <span>Tạo kịch bản mới</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {scripts.map(s => {
                const isExpanded = expandedScriptId === s.scriptId;
                const isCopied = copiedId === s.scriptId;

                return (
                  <div
                    key={s.scriptId}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3.5">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            {s.scriptId}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStageColor(
                              s.funnelStage
                            )}`}
                          >
                            {s.funnelStage}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleOpenEditScript(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Sửa kịch bản"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() =>
                              setDeletingItem({
                                type: 'script',
                                id: s.scriptId,
                                name: `Kịch bản ${s.scriptId}`,
                              })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Xóa kịch bản"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Content Type */}
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {s.contentType}
                      </p>

                      {/* 🎣 HOOK Box */}
                      <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/90 rounded-xl p-3.5 border border-indigo-100">
                        <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>🎣</span> HOOK (3-5 GIÂY ĐẦU)
                        </p>
                        <p className="text-sm font-semibold text-slate-900 leading-snug whitespace-pre-line">
                          {s.hook}
                        </p>
                      </div>

                      {/* Expanded Sections */}
                      {isExpanded && (
                        <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                          {s.painPoint && (
                            <div className="bg-red-50/80 rounded-xl p-3 border border-red-100 text-xs">
                              <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider mb-1">
                                💢 VẤN ĐỀ (PAIN POINT)
                              </p>
                              <p className="text-red-950 whitespace-pre-line leading-relaxed">
                                {s.painPoint}
                              </p>
                            </div>
                          )}

                          {s.solution && (
                            <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-100 text-xs">
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">
                                ✅ GIẢI PHÁP (SOLUTION)
                              </p>
                              <p className="text-emerald-950 whitespace-pre-line leading-relaxed">
                                {s.solution}
                              </p>
                            </div>
                          )}

                          {s.cta && (
                            <div className="bg-purple-50/80 rounded-xl p-3 border border-purple-100 text-xs">
                              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">
                                📣 KÊU GỌI HÀNH ĐỘNG (CTA)
                              </p>
                              <p className="text-purple-950 font-semibold whitespace-pre-line leading-relaxed">
                                {s.cta}
                              </p>
                            </div>
                          )}

                          {s.caption && (
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                                📝 KỊCH BẢN CHI TIẾT (CAPTION)
                              </p>
                              <p className="text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                                {s.caption}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {s.duration || '15-30s'}
                        </span>
                        {s.expectedKpi && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]" title={s.expectedKpi}>
                            <Target size={12} className="text-slate-400" />
                            {s.expectedKpi}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: 3 Nút Đổi Trạng Thái 1-Click + Nút Chi Tiết & Copy */}
                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2.5">
                      {/* 3 Nút Trạng Thái Nhanh 1-Click */}
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          onClick={() => handleQuickStatusChange(s.scriptId, 'Chưa Dùng')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            s.status === 'Chưa Dùng'
                              ? 'bg-white text-slate-800 shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <CircleDashed size={11} />
                          <span>Chưa dùng</span>
                        </button>
                        <button
                          onClick={() => handleQuickStatusChange(s.scriptId, 'Đã Lên Lịch')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            s.status === 'Đã Lên Lịch'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Clock3 size={11} />
                          <span>Lên lịch</span>
                        </button>
                        <button
                          onClick={() => handleQuickStatusChange(s.scriptId, 'Đã Dùng')}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                            s.status === 'Đã Dùng'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <CheckCircle2 size={11} />
                          <span>Đã dùng</span>
                        </button>
                      </div>

                      {/* Expand Button & Copy Button */}
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() =>
                            setExpandedScriptId(isExpanded ? null : s.scriptId)
                          }
                          className="text-xs font-semibold text-slate-600 hover:text-purple-600 transition flex items-center gap-1"
                        >
                          {isExpanded ? (
                            <>
                              <span>Thu gọn</span>
                              <ChevronUp size={14} />
                            </>
                          ) : (
                            <>
                              <span>Xem chi tiết</span>
                              <ChevronDown size={14} />
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => copyFullScript(s)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                            isCopied
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check size={13} className="stroke-[3]" />
                              <span>Đã chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Sao chép</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: LỊCH ĐĂNG NỘI DUNG 30 NGÀY */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Ngày
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Tuần
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Định dạng
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Chủ đề
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Kênh & Giờ
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3.5 text-left font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Ghi chú
                  </th>
                  <th className="px-4 py-3.5 text-right font-bold text-slate-600 text-xs uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calendar.map((c, i) => (
                  <tr key={c.id || i} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-purple-700 text-xs">
                      {c.date}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                      {c.week || 'Tuần 1'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">
                        {c.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-900 max-w-xs leading-relaxed">
                      {c.topic}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.channel === 'Instagram'
                              ? 'bg-pink-100 text-pink-700'
                              : c.channel === 'TikTok'
                              ? 'bg-slate-900 text-white'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {c.channel || 'Instagram'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {c.postTime || '20:00'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <select
                        value={c.status}
                        onChange={e => handleCalStatusChange(c.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${getCalendarStatusColor(
                          c.status
                        )}`}
                      >
                        <option value="📝 Chưa Làm">📝 Chưa Làm</option>
                        <option value="⏳ Đang Làm">⏳ Đang Làm</option>
                        <option value="✅ Đã Đăng">✅ Đã Đăng</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                      {c.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditCal(c)}
                          className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Sửa lịch"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setDeletingItem({
                              type: 'calendar',
                              id: c.id,
                              name: `Lịch ngày ${c.date}`,
                            })
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Xóa lịch"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CÔNG THỨC KỊCH BẢN VÀNG (6 BƯỚC CHUẨN) */}
      {activeTab === 'formulas' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold backdrop-blur-sm">
              <Sparkles size={14} className="text-amber-300" />
              <span>Công Thức Vàng Viết Video Ads May Đo</span>
            </div>
            <h3 className="text-xl font-bold font-display">
              CÔNG THỨC 6 BƯỚC: HOOK ➔ PROBLEM ➔ EMPATHY ➔ SOLUTION ➔ PROOF ➔ CTA
            </h3>
            <p className="text-sm text-purple-200 leading-relaxed max-w-3xl">
              Quy chuẩn viết kịch bản video chuyển đổi cao cho đội ngũ Content Creator & Editor của Cây Kim May Đo. Tuân thủ đúng cấu trúc thời lượng để tối ưu Watch time và CTR.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formulas.map(f => (
              <div
                key={f.stepNumber}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center font-mono">
                      {f.stepNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base font-display">
                        {f.name}
                      </h4>
                      <span className="text-xs text-purple-600 font-semibold">
                        ⏱️ Thời lượng: {f.duration}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {f.importance}
                  </span>
                </div>

                {/* Mục tiêu */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-0.5">🎯 Mục tiêu:</span>
                  <p className="leading-relaxed">{f.goal}</p>
                </div>

                {/* DOs & DON'Ts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-100 text-emerald-950 space-y-1">
                    <span className="font-bold text-emerald-800 block mb-1">✅ NÊN LÀM:</span>
                    {f.dos.map((d, idx) => (
                      <p key={idx} className="leading-relaxed">
                        • {d}
                      </p>
                    ))}
                  </div>

                  <div className="bg-red-50/80 rounded-xl p-3 border border-red-100 text-red-950 space-y-1">
                    <span className="font-bold text-red-800 block mb-1">❌ NÊN TRÁNH:</span>
                    {f.donts.map((d, idx) => (
                      <p key={idx} className="leading-relaxed">
                        • {d}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Ví Dụ */}
                <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/70 text-xs text-amber-950 space-y-1">
                  <span className="font-bold text-amber-900 block mb-1">💡 VÍ DỤ THỰC CHIẾN:</span>
                  {f.examples.map((ex, idx) => (
                    <p key={idx} className="leading-relaxed font-medium">
                      {ex}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Thêm / Sửa Video Script */}
      {isScriptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-display">
                    {editingScript ? 'Chỉnh Sửa Video Script' : 'Thêm Kịch Bản Video Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingScript ? `Mã: ${editingScript.scriptId}` : 'Nhập thông tin kịch bản video'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsScriptModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveScript} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mã Kịch Bản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={scriptFormData.scriptId}
                    disabled={!!editingScript}
                    onChange={e => setScriptFormData({ ...scriptFormData, scriptId: e.target.value })}
                    placeholder="VD: TOF-16, MOF-11..."
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tầng Phễu <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={scriptFormData.funnelStage}
                    onChange={e => setScriptFormData({ ...scriptFormData, funnelStage: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  >
                    <option value="TOF">🔵 TOF (Top of Funnel)</option>
                    <option value="MOF">🟠 MOF (Mid of Funnel)</option>
                    <option value="BOF">🟢 BOF (Bottom of Funnel)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng Thái
                  </label>
                  <select
                    value={scriptFormData.status}
                    onChange={e => setScriptFormData({ ...scriptFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  >
                    <option value="Chưa Dùng">⚪ Chưa Dùng</option>
                    <option value="Đã Lên Lịch">🟡 Đã Lên Lịch</option>
                    <option value="Đã Dùng">🟢 Đã Dùng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Định Dạng (Content Pillar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={scriptFormData.contentType}
                  onChange={e => setScriptFormData({ ...scriptFormData, contentType: e.target.value })}
                  placeholder="VD: BEFORE-AFTER, PROBLEM-SOLUTION, PINTEREST..."
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                />
              </div>

              {/* Hook */}
              <div>
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5">
                  🎣 HOOK (3-5 giây đầu) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={scriptFormData.hook}
                  onChange={e => setScriptFormData({ ...scriptFormData, hook: e.target.value })}
                  placeholder="Nhập câu hook mở đầu video..."
                  required
                  className="w-full px-3.5 py-2 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition resize-y"
                />
              </div>

              {/* Pain Point & Solution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-red-700 uppercase tracking-wider mb-1.5">
                    💢 Vấn Đề (Pain Point)
                  </label>
                  <textarea
                    rows={3}
                    value={scriptFormData.painPoint}
                    onChange={e => setScriptFormData({ ...scriptFormData, painPoint: e.target.value })}
                    placeholder="Mô tả nỗi đau/vấn đề khách gặp phải..."
                    className="w-full px-3.5 py-2 bg-red-50/40 border border-red-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none transition resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                    ✅ Giải Pháp (Solution)
                  </label>
                  <textarea
                    rows={3}
                    value={scriptFormData.solution}
                    onChange={e => setScriptFormData({ ...scriptFormData, solution: e.target.value })}
                    placeholder="Giải pháp may đo từ Cây Kim May Đo..."
                    className="w-full px-3.5 py-2 bg-emerald-50/40 border border-emerald-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none transition resize-y"
                  />
                </div>
              </div>

              {/* CTA & Caption */}
              <div>
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5">
                  📣 Kêu Gọi Hành Động (CTA)
                </label>
                <input
                  type="text"
                  value={scriptFormData.cta}
                  onChange={e => setScriptFormData({ ...scriptFormData, cta: e.target.value })}
                  placeholder="VD: Lưu video để nhận voucher 100k, Inbox nhận tư vấn số đo..."
                  className="w-full px-3.5 py-2 bg-purple-50/40 border border-purple-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  📝 Kịch Bản Chi Tiết (Caption / Lời Thoại)
                </label>
                <textarea
                  rows={3}
                  value={scriptFormData.caption}
                  onChange={e => setScriptFormData({ ...scriptFormData, caption: e.target.value })}
                  placeholder="Chi tiết lời thoại diễn xuất hoặc caption đăng kèm bài..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thời Lượng
                  </label>
                  <input
                    type="text"
                    value={scriptFormData.duration}
                    onChange={e => setScriptFormData({ ...scriptFormData, duration: e.target.value })}
                    placeholder="VD: 15-30s"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    KPI Kỳ Vọng
                  </label>
                  <input
                    type="text"
                    value={scriptFormData.expectedKpi}
                    onChange={e => setScriptFormData({ ...scriptFormData, expectedKpi: e.target.value })}
                    placeholder="VD: Save Rate > 3%, View > 10K..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsScriptModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingScript ? 'Lưu Thay Đổi' : 'Tạo Kịch Bản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm / Sửa Lịch Content */}
      {isCalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-display">
                    {editingCal ? 'Chỉnh Sửa Lịch Đăng' : 'Thêm Lịch Đăng Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lên lịch đăng bài 30 ngày cho các kênh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCal} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ngày (DD/MM) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={calFormData.date}
                    onChange={e => setCalFormData({ ...calFormData, date: e.target.value })}
                    placeholder="VD: 01/05"
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tuần
                  </label>
                  <input
                    type="text"
                    value={calFormData.week}
                    onChange={e => setCalFormData({ ...calFormData, week: e.target.value })}
                    placeholder="VD: Tuần 1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Chủ Đề Bài Đăng <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={calFormData.topic}
                  onChange={e => setCalFormData({ ...calFormData, topic: e.target.value })}
                  placeholder="VD: Khách thật: Váy midi che bụng hiệu quả..."
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kênh Đăng
                  </label>
                  <select
                    value={calFormData.channel}
                    onChange={e => setCalFormData({ ...calFormData, channel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none transition"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Giờ Đăng
                  </label>
                  <input
                    type="text"
                    value={calFormData.postTime}
                    onChange={e => setCalFormData({ ...calFormData, postTime: e.target.value })}
                    placeholder="VD: 20:00"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Định Dạng
                  </label>
                  <input
                    type="text"
                    value={calFormData.contentType}
                    onChange={e => setCalFormData({ ...calFormData, contentType: e.target.value })}
                    placeholder="VD: Before – After"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng Thái
                  </label>
                  <select
                    value={calFormData.status}
                    onChange={e => setCalFormData({ ...calFormData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:outline-none transition"
                  >
                    <option value="📝 Chưa Làm">📝 Chưa Làm</option>
                    <option value="⏳ Đang Làm">⏳ Đang Làm</option>
                    <option value="✅ Đã Đăng">✅ Đã Đăng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  value={calFormData.notes}
                  onChange={e => setCalFormData({ ...calFormData, notes: e.target.value })}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none transition"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCalModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingCal ? 'Lưu Thay Đổi' : 'Tạo Lịch Đăng'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Xóa */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1 font-display">
                Xác Nhận Xóa?
              </h3>
              <p className="text-xs text-slate-500">
                Bạn có chắc muốn xóa <span className="font-semibold text-slate-800">&quot;{deletingItem.name}&quot;</span>? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={14} className="animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
