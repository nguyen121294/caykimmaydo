'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/app/components/page-header';
import { Modal, Input, Select } from '@/app/components/form-controls';
import { parseTaskViewBuffer } from '@/lib/task-import';

const taskStatuses = ['Giao việc', 'Đang thực thi', 'Đã hoàn thành', 'Huỷ'];

const roleData = {
  OWNER: {
    name: 'Chủ shop',
    icon: '👑',
    color: 'from-amber-500 to-orange-500',
    description: 'Quản lý tổng thể, định hướng kinh doanh và phát triển thương hiệu',
    dailyTasks: [
      'Kiểm tra báo cáo doanh thu hàng ngày',
      'Duyệt các đơn hàng quan trọng',
      'Theo dõi tiến độ team',
      'Phản hồi khách hàng VIP',
    ],
    weeklyTasks: [
      'Họp team đầu tuần định hướng công việc',
      'Phân tích báo cáo tuần',
      'Lên kế hoạch marketing',
      'Đánh giá hiệu suất nhân viên',
    ],
    tools: ['Dashboard tổng', 'Báo cáo doanh thu', 'CRM khách hàng'],
  },
  CONTENT: {
    name: 'Content / Marketing',
    icon: '✍️',
    color: 'from-pink-500 to-rose-500',
    description: 'Sáng tạo nội dung, xây dựng thương hiệu và thu hút khách hàng',
    dailyTasks: [
      'Đăng bài Facebook/Instagram',
      'Trả lời inbox khách hàng',
      'Quay/chụp sản phẩm mới',
      'Cập nhật story hàng ngày',
    ],
    weeklyTasks: [
      'Lên content plan tuần',
      'Sản xuất video review',
      'Phối hợp với KOL/Influencer',
      'Phân tích tương tác',
    ],
    tools: ['Canva', 'CapCut', 'Meta Business', 'Google Drive'],
  },
  TAILOR: {
    name: 'Thợ may',
    icon: '🪡',
    color: 'from-blue-500 to-indigo-500',
    description: 'Cắt may, hoàn thiện sản phẩm theo đúng số đo và thiết kế',
    dailyTasks: [
      'Nhận đơn hàng và số đo',
      'Cắt vải theo rập',
      'May sản phẩm',
      'Kiểm tra chất lượng',
    ],
    weeklyTasks: [
      'Tổng hợp đơn đã hoàn thành',
      'Báo cáo nguyên phụ liệu',
      'Đề xuất cải tiến quy trình',
    ],
    tools: ['Máy may', 'Rập mẫu', 'Sổ ghi đơn'],
  },
  ADS: {
    name: 'Quảng cáo',
    icon: '📣',
    color: 'from-purple-500 to-violet-500',
    description: 'Chạy quảng cáo, tối ưu chi phí và tăng chuyển đổi',
    dailyTasks: [
      'Theo dõi hiệu suất ads',
      'Tối ưu campaign',
      'A/B test creative',
      'Báo cáo CPC/CPM',
    ],
    weeklyTasks: [
      'Phân tích ROI/ROAS',
      'Lên budget tuần',
      'Test landing page mới',
    ],
    tools: ['Meta Ads Manager', 'Google Ads', 'TikTok Ads'],
  },
  CUSTOMER: {
    name: 'Chăm sóc KH',
    icon: '💬',
    color: 'from-green-500 to-emerald-500',
    description: 'Tư vấn, hỗ trợ khách hàng và xây dựng mối quan hệ',
    dailyTasks: [
      'Trả lời tin nhắn/cuộc gọi',
      'Tư vấn đo số/chọn vải',
      'Theo dõi tiến độ đơn',
      'Nhắc lịch thử đồ',
    ],
    weeklyTasks: [
      'Gửi feedback request',
      'Chăm sóc khách cũ',
      'Báo cáo phản hồi',
    ],
    tools: ['Zalo', 'Facebook Messenger', 'Google Sheets'],
  },
};

function statusBadge(s: string) {
  if (s === 'Đã hoàn thành') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (s === 'Đang thực thi') {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (s === 'Giao việc') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (s === 'Huỷ' || s === 'Hủy') {
    return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function assigneeBadge(name: string | null) {
  if (!name) return 'bg-slate-100 text-slate-600';
  if (name.includes('Ngọc')) return 'bg-purple-100 text-purple-800 border-purple-200';
  if (name.includes('Hà')) return 'bg-sky-100 text-sky-800 border-sky-200';
  if (name.includes('Thoa')) return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-indigo-100 text-indigo-800 border-indigo-200';
}

export default function TeamContent() {
  const [view, setView] = useState<'tasks' | 'roles'>('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterDept, setFilterDept] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyTask = {
    name: '',
    department: '',
    assignee: 'Ngọc',
    deadline: '',
    status: 'Giao việc',
    description: '',
    note: '',
    sourceUrl: '',
    sourceUrl2: '',
  };
  const [form, setForm] = useState<any>(emptyTask);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      const list = data?.tasks ?? (Array.isArray(data) ? data : []);
      setTasks(list);
    } catch {
      toast.error('Lỗi tải danh sách công việc');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function syncLocalExcel() {
    if (!confirm('Đồng bộ lại toàn bộ dữ liệu từ file docs/taskview.xlsx?')) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-file' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đồng bộ');
      toast.success(data.message || 'Đã đồng bộ thành công');
      loadTasks();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi đồng bộ file Excel');
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Đang đọc file Excel...');
      const buffer = Buffer.from(await file.arrayBuffer());
      const items = parseTaskViewBuffer(buffer);
      if (items.length === 0) {
        toast.error('Không tìm thấy dữ liệu công việc trong file.');
        return;
      }

      if (confirm(`Tìm thấy ${items.length} công việc. Bạn có muốn nạp vào bảng công việc không?`)) {
        setSyncing(true);
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', items, overwrite: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi import');
        toast.success(`Đã nạp ${data.count} công việc thành công!`);
        loadTasks();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xử lý file Excel');
    } finally {
      setSyncing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyTask });
    setShowForm(true);
  }

  function openEdit(t: any) {
    setEditing(t);
    const sources = Array.isArray(t.checklist)
      ? t.checklist.map((c: any) => c.url || c.text).filter((u: any) => typeof u === 'string' && u.startsWith('http'))
      : [];

    setForm({
      name: t.name || '',
      department: t.department || '',
      assignee: t.assignee || '',
      deadline: t.deadline || '',
      status: t.status || 'Giao việc',
      description: t.description || '',
      note: t.note || '',
      sourceUrl: sources[0] || '',
      sourceUrl2: sources[1] || '',
    });
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.name && !form.department && !form.description) {
      toast.error('Vui lòng nhập tên công việc hoặc chi tiết');
      return;
    }
    try {
      const checklist: any[] = [];
      if (form.sourceUrl) checklist.push({ text: 'Nguồn 1', url: form.sourceUrl, done: form.status === 'Đã hoàn thành' });
      if (form.sourceUrl2) checklist.push({ text: 'Nguồn 2', url: form.sourceUrl2, done: form.status === 'Đã hoàn thành' });

      const payload = {
        name: form.name || form.department || 'Công việc',
        department: form.department || 'Tổng hợp',
        description: form.description || form.name || '',
        assignee: form.assignee || null,
        deadline: form.deadline || null,
        status: form.status || 'Giao việc',
        note: form.note || null,
        checklist,
      };

      if (editing) {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Đã cập nhật công việc');
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Đã thêm công việc mới');
      }
      setShowForm(false);
      loadTasks();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi lưu công việc');
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Đã xóa công việc');
      loadTasks();
    } catch {
      toast.error('Lỗi xóa công việc');
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Update failed');
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      toast.success('Đã đổi trạng thái');
    } catch {
      toast.error('Lỗi cập nhật trạng thái');
    }
  }

  // Unique options for filters
  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignee) set.add(t.assignee);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Statistics
  const stats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let cancelled = 0;

    tasks.forEach((t) => {
      if (t.status === 'Đã hoàn thành') completed++;
      else if (t.status === 'Đang thực thi') inProgress++;
      else if (t.status === 'Huỷ' || t.status === 'Hủy') cancelled++;
      else pending++;
    });

    return { total: tasks.length, completed, inProgress, pending, cancelled };
  }, [tasks]);

  // Filtered List
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
      if (filterDept !== 'all' && t.department !== filterDept) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (t.name || '').toLowerCase().includes(q);
        const matchDept = (t.department || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchAssignee = (t.assignee || '').toLowerCase().includes(q);
        const matchNote = (t.note || '').toLowerCase().includes(q);
        if (!matchName && !matchDept && !matchDesc && !matchAssignee && !matchNote) return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterAssignee, filterDept, search]);

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Team & Bảng Công Việc"
        description="Quản lý phân công, tiến độ và quy trình làm việc xưởng"
        icon={Users}
        onRefresh={loadTasks}
      >
        <div className="inline-flex bg-slate-100 rounded-xl p-1 border border-slate-200/80 shadow-sm">
          <button
            onClick={() => setView('tasks')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'tasks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Bảng công việc ({tasks.length})
          </button>
          <button
            onClick={() => setView('roles')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              view === 'roles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👥 Vai trò & Quy trình
          </button>
        </div>
      </PageHeader>

      {view === 'tasks' && (
        <div className="space-y-5 w-full">
          {/* KPI Cards Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 w-full">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Tổng công việc</div>
              <div className="text-2xl lg:text-3xl font-bold text-slate-900 mt-1">{stats.total}</div>
            </div>
            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm">
              <div className="text-xs font-medium text-emerald-700">Đã hoàn thành</div>
              <div className="text-2xl lg:text-3xl font-bold text-emerald-700 mt-1">{stats.completed}</div>
            </div>
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-sm">
              <div className="text-xs font-medium text-blue-700">Đang thực thi</div>
              <div className="text-2xl lg:text-3xl font-bold text-blue-700 mt-1">{stats.inProgress}</div>
            </div>
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-sm">
              <div className="text-xs font-medium text-amber-700">Giao việc (Chờ)</div>
              <div className="text-2xl lg:text-3xl font-bold text-amber-700 mt-1">{stats.pending}</div>
            </div>
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-xs font-medium text-slate-500">Huỷ / Tạm dừng</div>
              <div className="text-2xl lg:text-3xl font-bold text-slate-600 mt-1">{stats.cancelled}</div>
            </div>
          </div>

          {/* Action Bar & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between w-full">
            {/* Search Box */}
            <div className="relative flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm công việc, chi tiết, người phụ trách, link nguồn..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs sm:text-sm pl-3 pr-8 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Selects */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value="all">Tất cả tình trạng</option>
                {taskStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={filterAssignee}
                onChange={(e) => {
                  setFilterAssignee(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
              >
                <option value="all">Tất cả người phụ trách</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setPage(1);
                }}
                className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 max-w-[180px] truncate cursor-pointer"
              >
                <option value="all">Tất cả nhóm</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Import / Sync / Create Actions */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={syncing}
                className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition border border-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                title="Tải lên file Excel để nạp công việc"
              >
                📥 Upload Excel
              </button>

              <button
                onClick={syncLocalExcel}
                disabled={syncing}
                className="text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition border border-slate-200 flex items-center gap-1.5 whitespace-nowrap"
                title="Đồng bộ lại từ docs/taskview.xlsx"
              >
                {syncing ? '⏳ Đang đồng bộ...' : '🔄 Đồng bộ file gốc'}
              </button>

              <button
                onClick={openCreate}
                className="text-xs px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                + Thêm việc
              </button>
            </div>
          </div>

          {/* Task Table View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-3.5 w-12 text-center whitespace-nowrap">STT</th>
                    <th className="py-3.5 px-3.5 min-w-[140px] whitespace-nowrap">Tình trạng</th>
                    <th className="py-3.5 px-3.5 w-32 whitespace-nowrap">Deadline</th>
                    <th className="py-3.5 px-3.5 w-40 whitespace-nowrap">Nhóm công việc</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Chi tiết công việc</th>
                    <th className="py-3.5 px-3.5 w-36 whitespace-nowrap">Người phụ trách</th>
                    <th className="py-3.5 px-3.5 min-w-[200px]">Nguồn / File đính kèm</th>
                    <th className="py-3.5 px-3.5 w-20 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Đang tải danh sách công việc...
                      </td>
                    </tr>
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Không tìm thấy công việc nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((t, idx) => {
                      const stt = (currentPage - 1) * pageSize + idx + 1;
                      const links = Array.isArray(t.checklist)
                        ? t.checklist.filter((c: any) => c.url && typeof c.url === 'string')
                        : [];

                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            t.status === 'Đã hoàn thành' ? 'bg-emerald-50/10' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3.5 text-center font-medium text-slate-400 whitespace-nowrap">
                            {stt}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap min-w-[140px]">
                            <select
                              value={t.status}
                              onChange={(e) => updateStatus(t.id, e.target.value)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none transition min-w-[132px] ${statusBadge(
                                t.status
                              )}`}
                            >
                              {taskStatuses.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-3.5 font-medium text-slate-600 whitespace-nowrap">
                            {t.deadline ? (
                              <span className="inline-flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 whitespace-nowrap">
                                <span>📅</span>
                                <span className="font-medium">{t.deadline}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 font-medium text-slate-900 whitespace-nowrap">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-[11px] font-medium border border-slate-200/60">
                              {t.department || t.name || 'Tổng hợp'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-normal text-slate-800 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                              {t.description || t.name}
                            </div>
                            {t.note && (
                              <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block border border-amber-200/50">
                                📝 {t.note}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 whitespace-nowrap">
                            {t.assignee ? (
                              <span
                                className={`inline-block font-semibold px-2.5 py-0.5 rounded-full border text-[11px] ${assigneeBadge(
                                  t.assignee
                                )}`}
                              >
                                {t.assignee}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Không có</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5">
                            {links.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {links.map((link: any, i: number) => {
                                  let label = `🔗 Nguồn ${i + 1}`;
                                  if (link.url.includes('docs.google.com/spreadsheets')) label = '📊 Google Sheet';
                                  else if (link.url.includes('instagram.com')) label = '📸 Instagram';
                                  else if (link.url.includes('apps.abacus.ai') || link.url.includes('maydo.abacusai')) label = '⚡ App/Agent';
                                  else if (link.url.includes('chatgpt.com') || link.url.includes('gemini.google')) label = '🤖 AI Chat';

                                  return (
                                    <a
                                      key={i}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 px-2 py-0.5 rounded transition border border-indigo-100 whitespace-nowrap"
                                      title={link.url}
                                    >
                                      {label} ↗
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Không có</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(t)}
                                className="text-slate-500 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition"
                                title="Chỉnh sửa"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => deleteTask(t.id)}
                                className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition"
                                title="Xóa"
                              >
                                🗑️
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

            {/* Pagination footer */}
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="whitespace-nowrap shrink-0">Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-slate-200 rounded px-2.5 py-1 bg-white font-medium focus:outline-none shrink-0"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={filteredTasks.length}>Tất cả ({filteredTasks.length})</option>
                </select>
                <span className="whitespace-nowrap shrink-0">dòng trên trang (Tổng {filteredTasks.length} công việc)</span>
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Trước
                </button>
                <span className="font-semibold text-slate-800">
                  Trang {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 border border-slate-200 rounded bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Sau →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Vai trò & Quy trình (Luôn mở đầy đủ 100%) */}
      {view === 'roles' && (
        <div className="space-y-6 w-full">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bản đồ Vai trò & Trách nhiệm Xưởng May</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ quy trình và nhiệm vụ hằng ngày, hằng tuần của từng vị trí được hiển thị chi tiết bên dưới.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 w-full">
            {Object.entries(roleData).map(([key, role]) => (
              <div
                key={key}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
              >
                {/* Card Header Gradient */}
                <div className={`bg-gradient-to-r ${role.color} text-white p-5 flex items-start gap-3.5`}>
                  <span className="text-3xl bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-inner">
                    {role.icon}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{role.name}</h3>
                    <p className="text-xs text-white/90 leading-relaxed mt-1">{role.description}</p>
                  </div>
                </div>

                {/* Card Body - Luôn mở 100% */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between bg-white">
                  <div className="space-y-4">
                    {/* Daily Tasks */}
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Nhiệm vụ Hằng ngày
                      </h4>
                      <ul className="text-xs text-slate-700 space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {role.dailyTasks.map((t: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold text-sm leading-none">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weekly Tasks */}
                    <div>
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        Nhiệm vụ Hằng tuần
                      </h4>
                      <ul className="text-xs text-slate-700 space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {role.weeklyTasks.map((t: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold text-sm leading-none">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tools */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      🛠️ Công cụ làm việc
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {role.tools.map((t: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200/60"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Thêm/Chỉnh sửa công việc */}
      {showForm && (
        <Modal
          title={editing ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}
          onClose={() => setShowForm(false)}
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Nhóm công việc / Hạng mục *"
              placeholder="VD: Chốt sản phẩm, Chuẩn bị launching, Marketing..."
              value={form.department}
              onChange={(v: string) => setForm({ ...form, department: v })}
            />

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Chi tiết công việc *
              </label>
              <textarea
                rows={3}
                placeholder="Mô tả cụ thể nội dung công việc cần thực hiện..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Người phụ trách"
                placeholder="VD: Ngọc, Hà, Thoa..."
                value={form.assignee}
                onChange={(v: string) => setForm({ ...form, assignee: v })}
              />

              <Input
                label="Deadline (Hạn hoàn thành)"
                placeholder="VD: 15/05/2026 hoặc trước tháng 5"
                value={form.deadline}
                onChange={(v: string) => setForm({ ...form, deadline: v })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Tình trạng"
                value={form.status}
                onChange={(v: string) => setForm({ ...form, status: v })}
                options={taskStatuses}
              />

              <Input
                label="File hoàn thành / Ghi chú"
                placeholder="Ghi chú hoàn tất..."
                value={form.note}
                onChange={(v: string) => setForm({ ...form, note: v })}
              />
            </div>

            <Input
              label="Link Nguồn 1 (Google Docs, Sheet, Instagram, App...)"
              placeholder="https://..."
              value={form.sourceUrl}
              onChange={(v: string) => setForm({ ...form, sourceUrl: v })}
            />

            <Input
              label="Link Nguồn 2 (Nếu có)"
              placeholder="https://..."
              value={form.sourceUrl2}
              onChange={(v: string) => setForm({ ...form, sourceUrl2: v })}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={saveForm}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                {editing ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
