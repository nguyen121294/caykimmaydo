'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  FileClock,
  FileDown,
  FileUp,
  History,
  LockKeyhole,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import type { FinanceRowKind, MonthValues } from '@/lib/finance-ledger';

type LedgerRow = {
  id: string;
  parentId: string | null;
  label: string;
  kind: FinanceRowKind;
  sortOrder: number;
  values: MonthValues;
};

type MonthStatus = { id: string; month: number; isClosed: boolean; closedAt: string | null; closedBy: string | null };
type AuditLog = {
  id: string;
  action: string;
  field: string | null;
  before: unknown;
  after: unknown;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
  row: { label: string } | null;
};
type LedgerData = {
  id: string;
  year: number;
  archived: boolean;
  rows: LedgerRow[];
  months: MonthStatus[];
  years: Array<{ year: number; archived: boolean }>;
  logs: AuditLog[];
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);
const GROUP_LABELS = new Set(['CHI PHÍ VẬN HÀNH', 'COST SẢN PHẨM', 'BIẾN PHÍ']);
const SPECIAL_KINDS: Record<string, FinanceRowKind> = {
  'TOTAL EXPENSES': 'TOTAL_EXPENSES',
  'TỔNG CHI PHÍ': 'TOTAL_EXPENSES',
  'DOANH THU': 'REVENUE',
  'LỢI NHUẬN': 'PROFIT',
};

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const compactMoney = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

async function readApiResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    throw new Error(`Máy chủ không trả dữ liệu (${response.status || 'mất kết nối'}). Vui lòng kiểm tra migration và log triển khai.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(response.ok ? 'Dữ liệu máy chủ trả về không hợp lệ' : `Máy chủ báo lỗi ${response.status}`);
  }
}

function orderedRows(rows: LedgerRow[]) {
  const children = new Map<string, LedgerRow[]>();
  rows.forEach((row) => {
    if (!row.parentId) return;
    children.set(row.parentId, [...(children.get(row.parentId) || []), row]);
  });
  const result: LedgerRow[] = [];
  rows.filter((row) => !row.parentId).sort((a, b) => a.sortOrder - b.sortOrder).forEach((row) => {
    result.push(row);
    result.push(...(children.get(row.id) || []).sort((a, b) => a.sortOrder - b.sortOrder));
  });
  return result;
}

function displayValue(row: LedgerRow, month: number, rows: LedgerRow[]): number {
  if (row.kind === 'GROUP') {
    return rows.filter((candidate) => candidate.parentId === row.id).reduce((sum, candidate) => sum + Number(candidate.values?.[String(month)] || 0), 0);
  }
  if (row.kind === 'TOTAL_EXPENSES') {
    return rows.filter((candidate) => candidate.kind === 'GROUP').reduce((sum, candidate) => sum + displayValue(candidate, month, rows), 0);
  }
  if (row.kind === 'PROFIT') {
    const revenue = rows.find((candidate) => candidate.kind === 'REVENUE');
    const expenses = rows.find((candidate) => candidate.kind === 'TOTAL_EXPENSES');
    return (revenue ? displayValue(revenue, month, rows) : 0) - (expenses ? displayValue(expenses, month, rows) : 0);
  }
  return Number(row.values?.[String(month)] || 0);
}

function actionLabel(action: string) {
  return ({
    CREATE_YEAR: 'Tạo sổ năm',
    ADD_ROW: 'Thêm dòng',
    DELETE_ROW: 'Xóa dòng',
    UPDATE_CELL: 'Sửa số liệu',
    RENAME_ROW: 'Đổi tên dòng',
    CLOSE_MONTH: 'Chốt tháng',
    REOPEN_MONTH: 'Mở lại tháng',
    IMPORT: 'Upload template',
  } as Record<string, string>)[action] || action;
}

export default function FinanceContent() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const uploadRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async (year = selectedYear) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance?year=${year}`, { cache: 'no-store' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || 'Không tải được dữ liệu');
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => { fetchData(selectedYear); }, [fetchData, selectedYear]);

  const rows = useMemo(() => orderedRows(data?.rows || []), [data?.rows]);
  const monthly = useMemo(() => MONTHS.map((month) => {
    const revenueRow = rows.find((row) => row.kind === 'REVENUE');
    const expenseRow = rows.find((row) => row.kind === 'TOTAL_EXPENSES');
    const revenue = revenueRow ? displayValue(revenueRow, month, rows) : 0;
    const expenses = expenseRow ? displayValue(expenseRow, month, rows) : 0;
    return { month: `T${month}`, 'Doanh thu': revenue, 'Chi phí': expenses, 'Lợi nhuận': revenue - expenses };
  }), [rows]);
  const totals = useMemo(() => monthly.reduce((acc, month) => ({
    revenue: acc.revenue + month['Doanh thu'],
    expenses: acc.expenses + month['Chi phí'],
    profit: acc.profit + month['Lợi nhuận'],
  }), { revenue: 0, expenses: 0, profit: 0 }), [monthly]);

  const request = async (method: string, body: unknown) => {
    const response = await fetch('/api/finance', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.error || 'Không thể lưu thay đổi');
    return result;
  };

  const saveCell = async (row: LedgerRow, month: number, rawValue: string) => {
    const amount = Number(rawValue.replace(/[^0-9.-]/g, '')) || 0;
    if (amount === Number(row.values?.[String(month)] || 0)) return;
    const key = `${row.id}-${month}`;
    setSavingCell(key);
    setData((current) => current ? ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, values: { ...item.values, [String(month)]: amount } } : item) }) : current);
    try {
      await request('PATCH', { action: 'UPDATE_CELL', rowId: row.id, month, amount });
      toast.success(`Đã lưu ${row.label}, tháng ${month}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu');
      fetchData();
    } finally {
      setSavingCell(null);
    }
  };

  const renameRow = async (row: LedgerRow, label: string) => {
    const normalized = label.trim();
    if (!normalized || normalized === row.label) return;
    try {
      await request('PATCH', { action: 'RENAME_ROW', rowId: row.id, label: normalized });
      setData((current) => current ? ({ ...current, rows: current.rows.map((item) => item.id === row.id ? { ...item, label: normalized } : item) }) : current);
      toast.success('Đã đổi tên dòng');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể đổi tên'); }
  };

  const addRow = async (parentId: string) => {
    if (!data) return;
    const label = window.prompt('Tên dòng thành phần mới:')?.trim();
    if (!label) return;
    try {
      await request('POST', { action: 'ADD_ROW', ledgerId: data.id, parentId, label });
      toast.success('Đã thêm dòng');
      fetchData();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể thêm dòng'); }
  };

  const deleteRow = async (row: LedgerRow) => {
    if (!window.confirm(`Xóa dòng “${row.label}”? Dữ liệu đã xóa sẽ còn trong lịch sử chỉnh sửa.`)) return;
    try {
      await request('DELETE', { rowId: row.id });
      toast.success('Đã xóa dòng');
      fetchData();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể xóa dòng'); }
  };

  const toggleMonth = async (month: number, isClosed: boolean) => {
    if (!data) return;
    try {
      await request('PATCH', { action: 'MONTH_STATUS', ledgerId: data.id, month, isClosed: !isClosed });
      toast.success(isClosed ? `Đã mở lại tháng ${month}` : `Đã đánh dấu chốt tháng ${month}`);
      fetchData();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái tháng'); }
  };

  const createYear = async () => {
    const suggested = Math.max(new Date().getFullYear(), ...(data?.years.map((item) => item.year + 1) || []));
    const year = Number(window.prompt('Nhập năm cần tạo:', String(suggested)));
    if (!Number.isInteger(year)) return;
    try {
      await request('POST', { action: 'CREATE_YEAR', year });
      setSelectedYear(year);
      toast.success(`Đã tạo sổ năm ${year}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể tạo năm'); }
  };

  const importTemplate = async (file: File) => {
    if (!data) return;
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
      let currentParent: string | null = null;
      const importedRows = grid.map((cells) => {
        const label = String(cells?.[0] || '').trim();
        if (!label || label.toLocaleUpperCase('vi') === 'HẠNG MỤC' || /^BÁO CÁO/i.test(label) || /^THÁNG/i.test(label)) return null;
        const upper = label.toLocaleUpperCase('vi');
        let kind: FinanceRowKind = SPECIAL_KINDS[upper] || (GROUP_LABELS.has(upper) ? 'GROUP' : 'DETAIL');
        if (kind === 'GROUP') currentParent = label;
        if (kind !== 'DETAIL') currentParent = kind === 'GROUP' ? label : null;
        const values: Record<string, number> = {};
        MONTHS.forEach((month) => {
          const cell = cells?.[month];
          if (cell !== null && cell !== '' && Number.isFinite(Number(cell))) values[String(month)] = Number(cell);
        });
        return { label, kind, parentLabel: kind === 'DETAIL' ? currentParent : null, values };
      }).filter(Boolean);
      if (!importedRows.length) throw new Error('Không tìm thấy dữ liệu trong template');
      await request('POST', { action: 'IMPORT', ledgerId: data.id, fileName: file.name, rows: importedRows });
      toast.success(`Đã cập nhật ${importedRows.length} dòng từ template`);
      fetchData();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Không thể đọc template'); }
    finally { if (uploadRef.current) uploadRef.current.value = ''; }
  };

  if (loading && !data) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500"><RefreshCw className="mr-2 animate-spin" size={18} />Đang mở sổ tài chính...</div>;
  }
  if (!data) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">Không thể mở dữ liệu tài chính.</div>;

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 text-slate-900">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-indigo-700"><CircleDollarSign size={18} />Sổ thu chi nội bộ</div>
          <h1 className="text-3xl font-bold tracking-tight">Báo cáo thu chi {data.year}</h1>
          <p className="mt-1 text-sm text-slate-500">Chỉnh trực tiếp từng ô. Dòng vàng được tính tự động từ các dòng thành phần.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <span className="sr-only">Chọn năm báo cáo</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="h-10 appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm font-semibold shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
              {data.years.map((item) => <option key={item.year} value={item.year}>{item.year}{item.archived ? ' (lưu trữ)' : ''}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-3 text-slate-500" size={16} />
          </label>
          <button onClick={createYear} className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"><Plus size={16} />Tạo năm</button>
          <a href="/templates/template-bao-cao-thu-chi.xlsx" download className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"><FileDown size={16} />Tải template</a>
          <input ref={uploadRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => event.target.files?.[0] && importTemplate(event.target.files[0])} />
          <button onClick={() => uploadRef.current?.click()} className="flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"><FileUp size={16} />Upload</button>
          <button onClick={() => setShowLogs(true)} className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"><History size={16} />Lịch sử</button>
        </div>
      </header>

      {data.archived && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><Archive size={17} />Đây là sổ năm cũ đã lưu trữ. Admin vẫn có thể xem và chỉnh sửa.</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-700">TỔNG DOANH THU</p><p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950">{money.format(totals.revenue)} ₫</p></div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-xs font-semibold text-rose-700">TỔNG CHI PHÍ</p><p className="mt-2 text-2xl font-bold tabular-nums text-rose-950">{money.format(totals.expenses)} ₫</p></div>
        <div className={`rounded-xl border p-4 ${totals.profit >= 0 ? 'border-indigo-200 bg-indigo-50' : 'border-orange-200 bg-orange-50'}`}><p className="text-xs font-semibold text-slate-700">LỢI NHUẬN CẢ NĂM</p><p className="mt-2 text-2xl font-bold tabular-nums">{money.format(totals.profit)} ₫</p></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div><h2 className="font-semibold">Bảng thu chi theo tháng</h2><p className="text-xs text-slate-500">Nhấn vào ô trắng để sửa, dữ liệu lưu khi rời ô.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><Save size={14} />{savingCell ? 'Đang lưu...' : 'Đã đồng bộ'}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th rowSpan={2} className="sticky left-0 z-20 min-w-[250px] border-r border-slate-700 bg-slate-900 px-3 py-3 text-left text-sm">Hạng mục</th>
                {MONTHS.map((month) => <th key={month} className="min-w-[100px] border-r border-slate-700 px-2 py-2 text-center">Tháng {month}</th>)}
                <th rowSpan={2} className="w-20 px-2 py-2">Thao tác</th>
              </tr>
              <tr className="bg-slate-800 text-slate-200">
                {MONTHS.map((month) => {
                  const status = data.months.find((item) => item.month === month);
                  return <th key={month} className="border-r border-slate-700 px-1 py-1.5"><button onClick={() => toggleMonth(month, Boolean(status?.isClosed))} title={status?.isClosed ? `Đã chốt bởi ${status.closedBy || 'admin'}, nhấn để mở lại` : 'Đánh dấu đã chốt'} className={`mx-auto flex items-center gap-1 rounded px-2 py-1 ${status?.isClosed ? 'bg-amber-300 text-amber-950' : 'text-slate-300 hover:bg-slate-700'}`}>{status?.isClosed ? <LockKeyhole size={12} /> : <UnlockKeyhole size={12} />}{status?.isClosed ? 'Đã chốt' : 'Chưa chốt'}</button></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isTotal = row.kind !== 'DETAIL';
                const isEditable = row.kind === 'DETAIL' || row.kind === 'REVENUE';
                return (
                  <tr key={row.id} className={isTotal ? 'bg-amber-200 font-semibold' : 'bg-white hover:bg-indigo-50/40'}>
                    <td className={`sticky left-0 z-10 border-b border-r border-slate-300 px-3 py-2 ${isTotal ? 'bg-amber-200' : 'bg-white'}`}>
                      <div className="flex items-center gap-2">
                        {row.kind === 'DETAIL' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />}
                        <input aria-label={`Tên hạng mục ${row.label}`} defaultValue={row.label} onBlur={(event) => renameRow(row, event.target.value)} className={`min-w-0 flex-1 bg-transparent outline-none focus:ring-1 focus:ring-indigo-400 ${row.kind === 'DETAIL' ? 'pl-2 font-normal' : ''}`} />
                        {row.kind === 'GROUP' && <button onClick={() => addRow(row.id)} title="Thêm dòng thành phần" className="rounded p-1 text-amber-900 hover:bg-amber-300"><Plus size={14} /></button>}
                      </div>
                    </td>
                    {MONTHS.map((month) => {
                      const value = displayValue(row, month, rows);
                      return <td key={month} className={`border-b border-r border-slate-300 p-0 text-right tabular-nums ${value < 0 ? 'text-rose-700' : ''}`}>
                        {isEditable ? <input aria-label={`${row.label}, tháng ${month}`} type="text" inputMode="decimal" defaultValue={value ? money.format(value) : ''} onFocus={(event) => { event.target.value = String(value || ''); event.target.select(); }} onBlur={(event) => { const nextValue = Number(event.target.value.replace(/[^0-9.-]/g, '')) || 0; saveCell(row, month, event.target.value); event.target.value = nextValue ? money.format(nextValue) : ''; }} className="h-10 w-full bg-transparent px-2 text-right outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500" /> : <span className="block px-2 py-3">{money.format(value)}</span>}
                      </td>;
                    })}
                    <td className={`border-b border-slate-300 text-center ${isTotal ? 'bg-amber-200' : 'bg-white'}`}>{row.kind === 'DETAIL' && <button onClick={() => deleteRow(row)} title="Xóa dòng" className="rounded p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <button onClick={() => setShowChart((value) => !value)} className="flex w-full items-center justify-between px-5 py-4 text-left"><span className="flex items-center gap-2 font-semibold"><BarChart3 size={18} className="text-indigo-600" />Tổng quan doanh thu, chi phí và lợi nhuận</span><ChevronDown className={`transition-transform ${showChart ? 'rotate-180' : ''}`} size={18} /></button>
        {showChart && <div className="border-t border-slate-100 p-4"><ResponsiveContainer width="100%" height={340}><ComposedChart data={monthly} margin={{ top: 10, right: 15, left: 15, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tickFormatter={(value) => compactMoney.format(value)} tick={{ fontSize: 11 }} /><Tooltip formatter={(value: number) => `${money.format(value)} ₫`} /><Legend /><Bar dataKey="Doanh thu" fill="#4f46e5" radius={[3, 3, 0, 0]} /><Bar dataKey="Chi phí" fill="#f59e0b" radius={[3, 3, 0, 0]} /><Line type="monotone" dataKey="Lợi nhuận" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} /></ComposedChart></ResponsiveContainer></div>}
      </section>

      {showLogs && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onClick={() => setShowLogs(false)}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 className="flex items-center gap-2 text-lg font-bold"><FileClock size={20} />Lịch sử chỉnh sửa</h2><p className="text-xs text-slate-500">100 thay đổi gần nhất của sổ năm {data.year}</p></div><button onClick={() => setShowLogs(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Đóng lịch sử"><X size={20} /></button></div><div className="divide-y divide-slate-100">{data.logs.length ? data.logs.map((log) => <div key={log.id} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{actionLabel(log.action)}{log.row?.label ? `: ${log.row.label}` : ''}</p><p className="mt-1 text-xs text-slate-500">{log.userName || log.userEmail || 'Admin'} · {new Date(log.createdAt).toLocaleString('vi-VN')}</p></div>{log.field && <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{log.field}</span>}</div>{log.action === 'UPDATE_CELL' && <p className="mt-2 text-xs text-slate-600">{money.format(Number(log.before || 0))} ₫ → <strong>{money.format(Number(log.after || 0))} ₫</strong></p>}</div>) : <div className="p-10 text-center text-sm text-slate-500">Chưa có thay đổi nào.</div>}</div></aside></div>}
    </div>
  );
}
