'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { Wallet, Plus, RefreshCw, X, TrendingUp, TrendingDown, ArrowUpDown, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FinanceEntry {
  id: string; date: string; type: string; category: string;
  description: string | null; amount: number; orderId: string | null; notes: string | null;
  createdAt: string;
}

const categories = {
  Thu: ['Doanh thu may đo', 'Cọc đơn hàng', 'Thu khác'],
  Chi: ['Vải + Nguyên liệu', 'Lương thợ may', 'Quảng cáo Ads', 'Vận chuyển', 'Mặt bằng', 'Điện nước', 'Chi khác'],
};

export default function FinanceContent() {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'Thu', category: 'Doanh thu may đo', description: '', amount: '', orderId: '', notes: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/finance');
      if (res.ok) setEntries(await res.json());
    } catch { toast.error('Lỗi tải dữ liệu'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.category || !form.amount) { toast.error('Vui lòng nhập đầy đủ thông tin'); return; }
    try {
      const res = await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        toast.success('Thêm giao dịch thành công');
        setShowAdd(false);
        setForm({ date: new Date().toISOString().split('T')[0], type: 'Thu', category: 'Doanh thu may đo', description: '', amount: '', orderId: '', notes: '' });
        fetchData();
      }
    } catch { toast.error('Lỗi thêm giao dịch'); }
  };

  const filtered = filterType === 'all' ? entries : entries.filter(e => e.type === filterType);
  const totalThu = entries.filter(e => e.type === 'Thu').reduce((s, e) => s + e.amount, 0);
  const totalChi = entries.filter(e => e.type === 'Chi').reduce((s, e) => s + e.amount, 0);
  const loiNhuan = totalThu - totalChi;
  // Using shared formatMoney from lib/utils

  // Chart: group by month
  const byMonth: Record<string, { thu: number; chi: number }> = {};
  entries.forEach(e => {
    const m = e.date?.substring(0, 7) || 'Khác';
    if (!byMonth[m]) byMonth[m] = { thu: 0, chi: 0 };
    if (e.type === 'Thu') byMonth[m].thu += e.amount;
    else byMonth[m].chi += e.amount;
  });
  const chartData = Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, v]) => ({
    month: month.substring(2),
    'Doanh thu': v.thu,
    'Chi phí': v.chi,
  }));

  const exportCSV = () => {
    const header = 'Ngày,Loại,Danh mục,Mô tả,Số tiền,Mã đơn';
    const rows = filtered.map(e => `${e.date},${e.type},${e.category},${e.description || ''},${e.amount},${e.orderId || ''}`);
    const csv = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tai_chinh.csv'; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="text-indigo-600" size={28} /> Tài Chính
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý doanh thu, chi phí, lợi nhuận</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
            <Download size={14} /> Xuất CSV
          </button>
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5">
            <Plus size={14} /> Thêm giao dịch
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} /><p className="text-xs font-medium">Tổng thu</p></div>
          <p className="text-2xl font-bold">{fmt(totalThu)}</p>
        </div>
        <div className="rounded-xl p-4 bg-red-50 text-red-700">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} /><p className="text-xs font-medium">Tổng chi</p></div>
          <p className="text-2xl font-bold">{fmt(totalChi)}</p>
        </div>
        <div className={`rounded-xl p-4 ${loiNhuan >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
          <div className="flex items-center gap-2 mb-1"><ArrowUpDown size={16} /><p className="text-xs font-medium">Lợi nhuận</p></div>
          <p className="text-2xl font-bold">{fmt(loiNhuan)}</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700">
          <p className="text-xs font-medium mb-1">Số giao dịch</p>
          <p className="text-2xl font-bold">{entries.length}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-slate-900 mb-4">Doanh thu vs Chi phí theo tháng</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="Doanh thu" fill="#10b981" radius={[4,4,0,0]} />
              <Bar dataKey="Chi phí" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter + Table */}
      <div className="flex gap-2 mb-2">
        {['all', 'Thu', 'Chi'].map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 rounded-lg text-sm ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {t === 'all' ? 'Tất cả' : t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Ngày</th>
                <th className="text-left px-4 py-3 font-semibold">Loại</th>
                <th className="text-left px-4 py-3 font-semibold">Danh mục</th>
                <th className="text-left px-4 py-3 font-semibold">Mô tả</th>
                <th className="text-left px-4 py-3 font-semibold">Số tiền</th>
                <th className="text-left px-4 py-3 font-semibold">Mã đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400">Chưa có giao dịch nào</td></tr>
              ) : filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{e.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'Thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{e.type}</span>
                  </td>
                  <td className="px-4 py-3">{e.category}</td>
                  <td className="px-4 py-3 text-slate-600">{e.description || '—'}</td>
                  <td className={`px-4 py-3 font-medium ${e.type === 'Thu' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {e.type === 'Thu' ? '+' : '-'}{fmt(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.orderId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Thêm giao dịch</h2>
              <button onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="date" className="w-full px-3 py-2.5 rounded-lg border text-sm" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              <div className="grid grid-cols-2 gap-3">
                <select className="px-3 py-2.5 rounded-lg border text-sm bg-white" value={form.type} onChange={e => {
                  const type = e.target.value as 'Thu' | 'Chi';
                  setForm({...form, type, category: categories[type][0]});
                }}>
                  <option value="Thu">Thu</option>
                  <option value="Chi">Chi</option>
                </select>
                <select className="px-3 py-2.5 rounded-lg border text-sm bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {categories[form.type as 'Thu' | 'Chi'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Mô tả" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" type="number" placeholder="Số tiền (VNĐ) *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
              <input className="w-full px-3 py-2.5 rounded-lg border text-sm" placeholder="Mã đơn hàng (nếu có)" value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value})} />
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
