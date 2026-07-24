'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { Modal, Input, Select } from '@/app/components/form-controls';

const departments = [
  'Tư vấn / Sale',
  'Đo số',
  'Thiết kế / Rập',
  'Cắt vải',
  'May',
  'Thử đồ',
  'Chỉnh sửa',
  'Hoàn thiện / QC',
  'Giao hàng',
  'Chăm sóc khách hàng',
];

const taskStatuses = ['Chưa làm', 'Đang làm', 'Chờ duyệt', 'Hoàn thành', 'Trễ hạn'];
const priorities = ['Thấp', 'Trung bình', 'Cao', 'Gấp'];

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

function formatDate(d: any) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}

function priorityColor(p: string) {
  if (p === 'Gấp') return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'Cao') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (p === 'Trung bình') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function statusColor(s: string) {
  if (s === 'Hoàn thành') return 'bg-green-100 text-green-700';
  if (s === 'Đang làm') return 'bg-blue-100 text-blue-700';
  if (s === 'Chờ duyệt') return 'bg-amber-100 text-amber-700';
  if (s === 'Trễ hạn') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function TeamContent() {
  const [view, setView] = useState('tasks');
  const [tasks, setTasks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [filterDept, setFilterDept] = useState('all');

  const emptyTask = {
    name: '',
    department: departments[0],
    assignee: '',
    orderId: '',
    priority: 'Trung bình',
    startDate: '',
    deadline: '',
    status: 'Chưa làm',
    description: '',
    note: '',
    checklist: [] as any[],
  };
  const [form, setForm] = useState<any>(emptyTask);

  async function loadAll() {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/orders'),
      ]);
      const tData = await tRes.json();
      const oData = await oRes.json();
      setTasks(Array.isArray(tData) ? tData : []);
      setOrders(Array.isArray(oData) ? oData : []);
    } catch (e) {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyTask });
    setShowForm(true);
  }

  function openEdit(t: any) {
    setEditing(t);
    setForm({
      name: t.name || '',
      department: t.department || departments[0],
      assignee: t.assignee || '',
      orderId: t.orderId || '',
      priority: t.priority || 'Trung bình',
      startDate: t.startDate ? new Date(t.startDate).toISOString().slice(0, 10) : '',
      deadline: t.deadline ? new Date(t.deadline).toISOString().slice(0, 10) : '',
      status: t.status || 'Chưa làm',
      description: t.description || '',
      note: t.note || '',
      checklist: Array.isArray(t.checklist) ? t.checklist : [],
    });
    setShowForm(true);
  }

  async function saveForm() {
    if (!form.name || !form.department) {
      toast.error('Vui lòng nhập tên task và phòng ban');
      return;
    }
    try {
      const payload = { ...form };
      if (editing) {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
        if (!res.ok) throw new Error('Update failed');
        toast.success('Đã cập nhật task');
      } else {
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Create failed');
        toast.success('Đã thêm task');
      }
      setShowForm(false);
      loadAll();
    } catch (e) {
      toast.error('Lỗi lưu task');
    }
  }

  async function deleteTask(id: string) {
    if (!confirm('Xóa task này?')) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Đã xóa');
      loadAll();
    } catch {
      toast.error('Lỗi xóa');
    }
  }

  async function updateField(id: string, patch: any) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) throw new Error('Update failed');
      loadAll();
    } catch {
      toast.error('Lỗi cập nhật');
    }
  }

  function addChecklistItem() {
    setForm({ ...form, checklist: [...(form.checklist || []), { text: '', done: false }] });
  }

  function updateChecklist(idx: number, text: string) {
    const next = [...(form.checklist || [])];
    next[idx] = { ...next[idx], text };
    setForm({ ...form, checklist: next });
  }

  function removeChecklistItem(idx: number) {
    const next = (form.checklist || []).filter((_: any, i: number) => i !== idx);
    setForm({ ...form, checklist: next });
  }

  async function toggleChecklistOnTask(task: any, idx: number) {
    const next = (task.checklist || []).map((it: any, i: number) =>
      i === idx ? { ...it, done: !it.done } : it,
    );
    await updateField(task.id, { checklist: next });
  }

  const filteredTasks = useMemo(() => {
    if (filterDept === 'all') return tasks;
    return tasks.filter((t) => t.department === filterDept);
  }, [tasks, filterDept]);

  const grouped = useMemo(() => {
    const map: any = {};
    departments.forEach((d) => (map[d] = []));
    filteredTasks.forEach((t) => {
      const d = t.department || departments[0];
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [filteredTasks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-600 hover:text-slate-900">←</Link>
            <h1 className="text-xl font-bold text-slate-900">Team & Quy trình</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/orders" className="text-sm text-slate-600 hover:text-slate-900">Đơn hàng</Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex bg-white rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setView('tasks')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                view === 'tasks' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bảng công việc
            </button>
            <button
              onClick={() => setView('roles')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                view === 'roles' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vai trò & Quy trình
            </button>
          </div>
          {view === 'tasks' && (
            <div className="flex items-center gap-2">
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-md bg-white"
              >
                <option value="all">Tất cả phòng ban</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md hover:bg-slate-800"
              >
                + Thêm task
              </button>
            </div>
          )}
        </div>

        {view === 'tasks' && (
          <div>
            {loading ? (
              <div className="text-center py-12 text-slate-500">Đang tải...</div>
            ) : (
              <div className="space-y-6">
                {departments.map((dept) => {
                  const list = grouped[dept] || [];
                  if (filterDept !== 'all' && filterDept !== dept) return null;
                  if (list.length === 0 && filterDept === 'all') return null;
                  return (
                    <div key={dept} className="bg-white rounded-lg border border-slate-200">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">{dept}</h3>
                        <span className="text-xs text-slate-500">{list.length} task</span>
                      </div>
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {list.length === 0 ? (
                          <div className="text-sm text-slate-400 col-span-full">Chưa có task</div>
                        ) : (
                          list.map((t: any) => {
                            const cl = Array.isArray(t.checklist) ? t.checklist : [];
                            const total = cl.length;
                            const done = cl.filter((it: any) => it.done).length;
                            const pct = total ? Math.round((done / total) * 100) : 0;
                            const isLate =
                              t.deadline &&
                              new Date(t.deadline) < new Date() &&
                              t.status !== 'Hoàn thành';
                            return (
                              <div
                                key={t.id}
                                className="border border-slate-200 rounded-md p-3 hover:shadow-sm transition"
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <button
                                    onClick={() => openEdit(t)}
                                    className="text-left font-medium text-slate-900 hover:text-slate-700"
                                  >
                                    {t.name}
                                  </button>
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded border ${priorityColor(
                                      t.priority,
                                    )}`}
                                  >
                                    {t.priority}
                                  </span>
                                </div>
                                {t.assignee && (
                                  <div className="text-xs text-slate-600 mb-1">
                                    👤 {t.assignee}
                                  </div>
                                )}
                                {t.orderId && (
                                  <div className="text-xs text-slate-600 mb-1">
                                    📦 {t.orderId}
                                  </div>
                                )}
                                {t.deadline && (
                                  <div
                                    className={`text-xs mb-2 ${
                                      isLate ? 'text-red-600 font-medium' : 'text-slate-600'
                                    }`}
                                  >
                                    ⏰ {formatDate(t.deadline)}
                                    {isLate ? ' (Trễ)' : ''}
                                  </div>
                                )}
                                {total > 0 && (
                                  <div className="mb-2">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                      <span>{done}/{total} mục</span>
                                      <span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full">
                                      <div
                                        className="h-1.5 bg-green-500 rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="mt-2 space-y-1">
                                      {cl.slice(0, 3).map((it: any, idx: number) => (
                                        <label
                                          key={idx}
                                          className="flex items-center gap-2 text-xs text-slate-700"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={!!it.done}
                                            onChange={() => toggleChecklistOnTask(t, idx)}
                                          />
                                          <span className={it.done ? 'line-through text-slate-400' : ''}>
                                            {it.text}
                                          </span>
                                        </label>
                                      ))}
                                      {cl.length > 3 && (
                                        <div className="text-xs text-slate-400">
                                          +{cl.length - 3} mục khác...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between gap-2 mt-2">
                                  <select
                                    value={t.status}
                                    onChange={(e) => updateField(t.id, { status: e.target.value })}
                                    className={`text-xs px-2 py-1 rounded ${statusColor(
                                      t.status,
                                    )} border-0 cursor-pointer`}
                                  >
                                    {taskStatuses.map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => deleteTask(t.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(roleData).map(([key, role]: any) => {
              const expanded = expandedRole === key;
              return (
                <div
                  key={key}
                  className="bg-white rounded-lg border border-slate-200 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedRole(expanded ? null : key)}
                    className={`w-full bg-gradient-to-r ${role.color} text-white p-4 flex items-center gap-3 text-left`}
                  >
                    <span className="text-3xl">{role.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold">{role.name}</h3>
                      <p className="text-xs opacity-90">{role.description}</p>
                    </div>
                    <span>{expanded ? '−' : '+'}</span>
                  </button>
                  {expanded && (
                    <div className="p-4 space-y-3">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Hằng ngày
                        </h4>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {role.dailyTasks.map((t: string, i: number) => (
                            <li key={i}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Hằng tuần
                        </h4>
                        <ul className="text-sm text-slate-700 space-y-1">
                          {role.weeklyTasks.map((t: string, i: number) => (
                            <li key={i}>• {t}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Công cụ
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {role.tools.map((t: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <Modal
          title={editing ? 'Sửa task' : 'Thêm task mới'}
          onClose={() => setShowForm(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Tên task *"
              value={form.name}
              onChange={(v: string) => setForm({ ...form, name: v })}
            />
            <Select
              label="Phòng ban *"
              value={form.department}
              options={departments}
              onChange={(v: string) => setForm({ ...form, department: v })}
            />
            <Input
              label="Người phụ trách"
              value={form.assignee}
              onChange={(v: string) => setForm({ ...form, assignee: v })}
            />
            <Select
              label="Đơn hàng liên quan"
              value={form.orderId}
              options={['', ...orders.map((o) => o.orderId)]}
              onChange={(v: string) => setForm({ ...form, orderId: v })}
            />
            <Select
              label="Mức độ ưu tiên"
              value={form.priority}
              options={priorities}
              onChange={(v: string) => setForm({ ...form, priority: v })}
            />
            <Select
              label="Trạng thái"
              value={form.status}
              options={taskStatuses}
              onChange={(v: string) => setForm({ ...form, status: v })}
            />
            <Input
              label="Ngày bắt đầu"
              type="date"
              value={form.startDate}
              onChange={(v: string) => setForm({ ...form, startDate: v })}
            />
            <Input
              label="Deadline"
              type="date"
              value={form.deadline}
              onChange={(v: string) => setForm({ ...form, deadline: v })}
            />
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              rows={2}
            />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Checklist</label>
              <button
                type="button"
                onClick={addChecklistItem}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                + Thêm mục
              </button>
            </div>
            <div className="space-y-2">
              {(form.checklist || []).map((it: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!it.done}
                    onChange={(e) => {
                      const next = [...form.checklist];
                      next[idx] = { ...next[idx], done: e.target.checked };
                      setForm({ ...form, checklist: next });
                    }}
                  />
                  <input
                    type="text"
                    value={it.text}
                    onChange={(e) => updateChecklist(idx, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                    placeholder="Nội dung mục..."
                  />
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(idx)}
                    className="text-red-500 text-sm"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={saveForm}
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md"
            >
              {editing ? 'Cập nhật' : 'Thêm task'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Hủy
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
