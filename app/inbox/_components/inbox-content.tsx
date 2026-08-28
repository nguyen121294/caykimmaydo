'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Search,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  RefreshCw,
  GitCommit,
  ShieldAlert,
  Gift,
  X,
  AlertTriangle,
  Send,
  User,
  Info,
  Filter,
} from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

interface ScriptItem {
  id: string;
  customerType: string;
  colorTag?: string | null;
  identifiers?: string | null;
  messageNumber?: string | null;
  sender?: string | null;
  label?: string | null;
  content?: string | null;
  sheetName?: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryItem {
  name: string;
  count: number;
}

interface StatsData {
  total: number;
  flowCount: number;
  objectionCount: number;
  retentionCount: number;
}

const DEFAULT_CATEGORIES = [
  'Quy trình chốt đơn',
  'Xử lý từ chối',
  'CSKH & Retention',
  'Khách hàng thân thiết',
  'Hỏi Giá',
  'Do Dự',
  'So Sánh Zara/H&M',
  'Sợ Không Vừa Dáng',
  'Sẵn Sàng Chốt',
];

export default function InboxContent() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    flowCount: 0,
    objectionCount: 0,
    retentionCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    customerType: 'Quy trình chốt đơn',
    label: '',
    content: '',
    sender: 'SHOP',
    messageNumber: '',
    identifiers: '',
    colorTag: 'blue',
  });

  // Delete State
  const [deletingScript, setDeletingScript] = useState<ScriptItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/inbox?${params.toString()}`);
      const json = await res.json();
      if (json) {
        setScripts(json.scripts ?? []);
        setCategories(json.categories ?? []);
        if (json.stats) setStats(json.stats);
      }
    } catch {
      toast.error('Không thể tải danh sách kịch bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingScript(null);
    setFormData({
      customerType: selectedCategory || 'Quy trình chốt đơn',
      label: '',
      content: '',
      sender: 'SHOP',
      messageNumber: '',
      identifiers: '',
      colorTag: 'blue',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (script: ScriptItem) => {
    setEditingScript(script);
    setFormData({
      customerType: script.customerType || 'Quy trình chốt đơn',
      label: script.label || '',
      content: script.content || '',
      sender: script.sender || 'SHOP',
      messageNumber: script.messageNumber || '',
      identifiers: script.identifiers || '',
      colorTag: script.colorTag || 'blue',
    });
    setIsModalOpen(true);
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.content.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và nội dung kịch bản');
      return;
    }

    try {
      setSaving(true);
      if (editingScript) {
        // Update
        const res = await fetch('/api/inbox', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingScript.id,
            ...formData,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
        toast.success('Đã cập nhật kịch bản thành công!');
      } else {
        // Create
        const res = await fetch('/api/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Thêm mới thất bại');
        toast.success('Đã thêm kịch bản mới thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi lưu kịch bản');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteScript = async () => {
    if (!deletingScript) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/inbox?id=${deletingScript.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Xóa thất bại');
      toast.success('Đã xóa kịch bản');
      setDeletingScript(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Có lỗi xảy ra khi xóa');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text || '');
      setCopiedId(id);
      toast.success('Đã sao chép nội dung tin nhắn!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Không thể copy vào bộ nhớ tạm');
    }
  };

  const getCategoryBadgeStyle = (type: string) => {
    if (type.includes('Quy trình') || type.includes('chốt đơn'))
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20';
    if (type.includes('từ chối') || type.includes('Giá cao') || type.includes('Seen'))
      return 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-500/20';
    if (type.includes('CSKH') || type.includes('Retention') || type.includes('Feedback'))
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
    if (type.includes('thân thiết') || type.includes('Membership') || type.includes('Quyền lợi'))
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
    return 'bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-slate-500/20';
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes('Quy trình') || type.includes('chốt đơn')) return '🔄';
    if (type.includes('từ chối')) return '🛡️';
    if (type.includes('CSKH') || type.includes('Retention')) return '🎁';
    if (type.includes('thân thiết') || type.includes('Membership')) return '👑';
    if (type.includes('Giá')) return '💰';
    if (type.includes('Dự')) return '🤔';
    return '💬';
  };

  // Group scripts by category
  const groupedScripts = useMemo(() => {
    const map: Record<string, ScriptItem[]> = {};
    for (const s of scripts) {
      const cat = s.customerType || 'Khác';
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    }
    return map;
  }, [scripts]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        title="Kho Kịch Bản Inbox"
        description="Thư viện kịch bản bán hàng & xử lý từ chối chuẩn hoá cho đội ngũ Sales"
        icon={MessageSquare}
        onRefresh={fetchData}
      >
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition active:scale-95"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>Thêm Kịch Bản Mới</span>
        </button>
      </PageHeader>

      {/* 4 Thống kê Thuần Kho Kịch Bản */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng kịch bản */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tổng Kịch Bản
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 font-display">{stats.total}</p>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              mẫu câu sẵn sàng
            </span>
          </div>
        </div>

        {/* Card 2: Quy trình chốt đơn */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Flow Chốt Đơn
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
              <GitCommit className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-blue-600 font-display">{stats.flowCount}</p>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              bước chuẩn may đo
            </span>
          </div>
        </div>

        {/* Card 3: Xử lý từ chối */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Xử Lý Từ Chối
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-purple-600 font-display">
              {stats.objectionCount}
            </p>
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              tình huống giá / seen
            </span>
          </div>
        </div>

        {/* Card 4: CSKH & Quyền lợi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              CSKH & Quyền Lợi
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
              <Gift className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-emerald-600 font-display">
              {stats.retentionCount}
            </p>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              mốc ngày & voucher
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search + Category Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm kịch bản theo từ khoá, tiêu đề, lưu ý..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Select Category */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={16} className="text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full md:w-64 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            >
              <option value="">Tất cả phân loại ({stats.total})</option>
              {categories.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
              selectedCategory === ''
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          {categories.map(c => {
            const isActive = selectedCategory === c.name;
            return (
              <button
                key={c.name}
                onClick={() => setSelectedCategory(isActive ? '' : c.name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                <span>{getCategoryIcon(c.name)}</span>
                <span>{c.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-purple-700/80 text-white' : 'bg-slate-200/80 text-slate-500'
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Script List Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500">Đang tải danh sách kịch bản...</p>
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
            {searchQuery
              ? `Không có kết quả phù hợp với từ khóa "${searchQuery}"`
              : 'Chưa có kịch bản nào trong danh mục này'}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Plus size={16} />
            <span>Thêm kịch bản đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedScripts).map(([category, items]) => (
            <div key={category} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{getCategoryIcon(category)}</span>
                  <h3 className="text-base font-bold text-slate-900 font-display">{category}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {items.length} kịch bản
                  </span>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((s, idx) => {
                  const isCopied = copiedId === s.id;
                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-3.5">
                        {/* Card Header Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.messageNumber && (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                {s.messageNumber}
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getCategoryBadgeStyle(
                                s.customerType
                              )}`}
                            >
                              {s.customerType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                                s.sender === 'KHÁCH'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {s.sender || 'SHOP'}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleOpenEditModal(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                              title="Chỉnh sửa kịch bản"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeletingScript(s)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                              title="Xóa kịch bản"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Title / Label */}
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {s.label || 'Kịch bản tin nhắn'}
                        </h4>

                        {/* Content Box */}
                        <div className="relative bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 text-slate-800 text-sm whitespace-pre-line leading-relaxed font-sans select-text">
                          {s.content}
                        </div>

                        {/* Notes / Tips Callout (identifiers) */}
                        {s.identifiers && (
                          <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200/70 text-amber-900 text-xs flex items-start gap-2.5">
                            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5 flex-1">
                              <span className="font-bold text-amber-800 block">
                                Lưu ý cho Sales:
                              </span>
                              <p className="whitespace-pre-line text-amber-900/90 leading-relaxed">
                                {s.identifiers}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Copy Button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {s.sheetName ? `Nguồn: ${s.sheetName}` : 'Kịch bản nội bộ'}
                        </span>
                        <button
                          onClick={() => copyToClipboard(s.content || '', s.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                            isCopied
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check size={14} className="stroke-[3]" />
                              <span>Đã sao chép!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Sao chép tin nhắn</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Thêm / Sửa Kịch Bản */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base font-display">
                    {editingScript ? 'Chỉnh Sửa Kịch Bản' : 'Thêm Kịch Bản Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingScript
                      ? 'Cập nhật nội dung và mẹo tư vấn cho kịch bản'
                      : 'Thêm mẫu tin nhắn mới vào kho kịch bản'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveScript} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Customer Type / Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phân loại / Nhóm kịch bản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formData.customerType}
                    onChange={e => setFormData({ ...formData, customerType: e.target.value })}
                    placeholder="VD: Quy trình chốt đơn, Xử lý từ chối..."
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  />
                  <datalist id="category-suggestions">
                    {DEFAULT_CATEGORIES.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                {/* Message Number / Step */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Thứ tự / Bước
                  </label>
                  <input
                    type="text"
                    value={formData.messageNumber}
                    onChange={e => setFormData({ ...formData, messageNumber: e.target.value })}
                    placeholder="VD: Bước 1, Tình huống 1, CSKH 2..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Title / Label */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tiêu đề / Mục đích kịch bản <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                    placeholder="VD: Báo giá vải cao cấp, Chốt cọc 70%..."
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  />
                </div>

                {/* Sender */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Người gửi
                  </label>
                  <select
                    value={formData.sender}
                    onChange={e => setFormData({ ...formData, sender: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition"
                  >
                    <option value="SHOP">SHOP (Tư vấn viên)</option>
                    <option value="KHÁCH">KHÁCH (Câu hỏi mẫu)</option>
                    <option value="HỆ THỐNG">HỆ THỐNG</option>
                  </select>
                </div>
              </div>

              {/* Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nội dung tin nhắn gửi khách <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Nhập nội dung tin nhắn tư vấn / chốt đơn..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-none transition resize-y font-sans"
                />
              </div>

              {/* Notes / Tips (identifiers) */}
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>Lưu ý & Mẹo thực chiến cho Sales (Tùy chọn)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.identifiers}
                  onChange={e => setFormData({ ...formData, identifiers: e.target.value })}
                  placeholder="VD: Nhắn ngay sau khi gửi hình ảnh, giải thích lý do trước khi chốt giá..."
                  className="w-full px-3.5 py-2 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition resize-y font-sans"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition active:scale-95 disabled:opacity-50"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingScript ? 'Lưu Thay Đổi' : 'Tạo Kịch Bản'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Xóa Kịch Bản */}
      {deletingScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1 font-display">
                Xác Nhận Xóa Kịch Bản?
              </h3>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa kịch bản{' '}
                <span className="font-semibold text-slate-800">
                  &quot;{deletingScript.label || 'này'}&quot;
                </span>
                ? Hành động này không thể hoàn tác.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingScript(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteScript}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={14} className="animate-spin" />}
                <span>Xóa kịch bản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
