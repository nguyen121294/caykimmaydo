'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Kanban, Plus, RefreshCw, X, DollarSign, User } from 'lucide-react';
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

const stages = [
  { key: 'Mới', label: 'Mới', color: 'bg-blue-500', bgLight: 'bg-blue-50 border-blue-200' },
  { key: 'Đang tư vấn', label: 'Đang tư vấn', color: 'bg-amber-500', bgLight: 'bg-amber-50 border-amber-200' },
  { key: 'Báo giá', label: 'Báo giá', color: 'bg-purple-500', bgLight: 'bg-purple-50 border-purple-200' },
  { key: 'Đặt cọc', label: 'Đặt cọc', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 border-emerald-200' },
  { key: 'Chốt đơn', label: 'Chốt đơn', color: 'bg-green-600', bgLight: 'bg-green-50 border-green-200' },
  { key: 'Thua', label: 'Thua', color: 'bg-red-500', bgLight: 'bg-red-50 border-red-200' },
];

const sourceOptions = ['Facebook', 'TikTok', 'Instagram', 'Zalo', 'Google', 'Giới thiệu', 'Khác'];

export default function SalesContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'Facebook', stage: 'Mới', value: '', assignee: '', nextAction: '', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/leads');
      if (res.ok) setLeads(await res.json());
    } catch { toast.error('Lỗi tải dữ liệu'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên lead'); return; }
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: parseFloat(form.value) || 0 })
      });
      if (res.ok) {
        toast.success('Thêm lead thành công');
        setShowAdd(false);
        setForm({ name: '', phone: '', source: 'Facebook', stage: 'Mới', value: '', assignee: '', nextAction: '', notes: '' });
        fetchData();
      }
    } catch { toast.error('Lỗi thêm lead'); }
  };

  const moveStage = async (id: string, newStage: string) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: newStage })
      });
      setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: newStage } : l));
      toast.success(`Chuyển sang ${newStage}`);
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const totalValue = leads.reduce((s, l) => s + l.value, 0);
  const wonValue = leads.filter(l => l.stage === 'Chốt đơn').reduce((s, l) => s + l.value, 0);
  // Using shared formatMoney from lib/utils

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Kanban className="text-indigo-600" size={28} /> Sales Pipeline
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý quy trình bán hàng dạng Kanban</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5">
            <Plus size={14} /> Thêm lead
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700">
          <p className="text-xs font-medium">Tổng lead</p>
          <p className="text-2xl font-bold">{leads.length}</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700">
          <p className="text-xs font-medium">Tổng giá trị</p>
          <p className="text-2xl font-bold">{fmt(totalValue)}</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <p className="text-xs font-medium">Đã chốt</p>
          <p className="text-2xl font-bold">{fmt(wonValue)}</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
          <p className="text-xs font-medium">Tỉ lệ chốt</p>
          <p className="text-2xl font-bold">{leads.length > 0 ? Math.round(leads.filter(l => l.stage === 'Chốt đơn').length / leads.length * 100) : 0}%</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage.key);
            const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);
            return (
              <div key={stage.key} className={`w-72 rounded-xl border ${stage.bgLight} p-3 flex-shrink-0`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                    <span className="font-semibold text-sm">{stage.label}</span>
                    <span className="text-xs bg-white/80 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                  </div>
                  <span className="text-xs font-medium opacity-70">{fmt(stageValue)}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {loading && stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">Đang tải...</div>
                  ) : stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border-2 border-dashed rounded-lg">Trống</div>
                  ) : stageLeads.map(lead => (
                    <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm border border-white/50 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm text-slate-900">{lead.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{lead.source}</span>
                      </div>
                      {lead.value > 0 && <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><DollarSign size={12} />{fmt(lead.value)}</p>}
                      {lead.phone && <p className="text-xs text-slate-500">{lead.phone}</p>}
                      {lead.assignee && <p className="text-xs text-slate-500 flex items-center gap-1"><User size={10} />{lead.assignee}</p>}
                      {lead.nextAction && <p className="text-xs text-indigo-600">{lead.nextAction}</p>}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {stages.filter(s => s.key !== stage.key).map(s => (
                          <button key={s.key} onClick={() => moveStage(lead.id, s.key)} className="text-[10px] px-2 py-0.5 rounded-full border hover:bg-slate-50" title={`Chuyển sang ${s.label}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Thêm lead mới</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Tên lead *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Số điện thoại" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <select className="px-3 py-2.5 rounded-lg border text-sm bg-white" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                  {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="px-3 py-2.5 rounded-lg border text-sm bg-white" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})}>
                  {stages.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Giá trị (VNĐ)" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Người phụ trách" value={form.assignee} onChange={e => setForm({...form, assignee: e.target.value})} />
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Hành động tiếp theo" value={form.nextAction} onChange={e => setForm({...form, nextAction: e.target.value})} />
              <textarea className="w-full px-3 py-2.5 rounded-lg border text-sm" rows={2} placeholder="Ghi chú" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Hủy</button>
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm">Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
