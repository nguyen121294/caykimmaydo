'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, DollarSign, FileSpreadsheet, Kanban, Link2, Loader2, Plus, RefreshCw, Search, User, X } from 'lucide-react';
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
  { key: 'Mới', label: 'Mới', color: 'bg-blue-500', bgLight: 'bg-blue-50 border-blue-200' },
  { key: 'Đang tư vấn', label: 'Đang tư vấn', color: 'bg-amber-500', bgLight: 'bg-amber-50 border-amber-200' },
  { key: 'Báo giá', label: 'Báo giá', color: 'bg-purple-500', bgLight: 'bg-purple-50 border-purple-200' },
  { key: 'Đặt cọc', label: 'Đặt cọc', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 border-emerald-200' },
  { key: 'Chốt đơn', label: 'Chốt đơn', color: 'bg-green-600', bgLight: 'bg-green-50 border-green-200' },
  { key: 'Thua', label: 'Thua', color: 'bg-red-500', bgLight: 'bg-red-50 border-red-200' },
];

const sourceOptions = ['Facebook', 'TikTok', 'Instagram', 'Zalo', 'Google', 'Giới thiệu', 'Khác'];

function clientErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
}

export default function SalesContent() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: 'Facebook', stage: 'Mới', value: '', assignee: '', nextAction: '', notes: '' });
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
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={() => { setShowImport(true); setImportError(null); setImportPreview(null); setImportResult(null); }} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5">
            <FileSpreadsheet size={14} /> Import Google Sheet
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

      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-green-600" /> Import Sales từ Google Sheet
              </h2>
              <button aria-label="Đóng" onClick={() => setShowImport(false)}><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="sales-google-sheet-url" className="text-sm font-medium text-slate-700 mb-1.5 block">Link Google Sheet công khai</label>
                <div className="relative">
                  <Link2 size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    id="sales-google-sheet-url"
                    type="url"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm"
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
                  <label htmlFor="sales-google-sheet-name" className="text-sm font-medium text-slate-700 mb-1.5 block">Chọn Sheet/Tab Sales *</label>
                  <select
                    id="sales-google-sheet-name"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm bg-white"
                    value={googleSheetName}
                    onChange={e => { setGoogleSheetName(e.target.value); setImportPreview(null); setImportResult(null); setImportError(null); }}
                  >
                    <option value="">-- Chọn đúng tab dữ liệu Sales --</option>
                    {googleSheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="sales-import-start-row" className="text-sm font-medium text-slate-700 mb-1 block">Dữ liệu bắt đầu từ hàng</label>
                <input id="sales-import-start-row" type="number" min="1" className="w-full px-3 py-2.5 rounded-lg border text-sm" value={importStartRow} onChange={e => { setImportStartRow(e.target.value); setImportPreview(null); setImportResult(null); }} />
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
                    <p className="text-sm font-semibold text-blue-900">Kết quả kiểm tra tab “{googleSheetName}”</p>
                    <p className="text-xs text-blue-700 mt-0.5">Tìm thấy {importPreview.validLeads} lead hợp lệ từ {importPreview.totalRows} dòng dữ liệu.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Lead mới</p><p className="text-lg font-bold text-emerald-600">{importPreview.newLeads}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng Sales</p><p className="text-lg font-bold text-amber-600">{importPreview.duplicateLeads}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng trong Sheet</p><p className="text-lg font-bold text-amber-600">{importPreview.repeatedInSheet}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Không hợp lệ</p><p className="text-lg font-bold text-red-600">{importPreview.invalidRows}</p></div>
                  </div>
                  {importPreview.duplicateSample.length > 0 && (
                    <div className="text-xs text-amber-800">
                      <p className="font-medium mb-1">Lead sẽ được cập nhật theo SĐT:</p>
                      {importPreview.duplicateSample.map(item => <p key={`${item.rowNumber}-${item.phone}`}>Hàng {item.rowNumber}: {item.name} · {item.phone}</p>)}
                    </div>
                  )}
                  {importPreview.invalidSample.length > 0 && (
                    <div className="text-xs text-red-700">
                      <p className="font-medium mb-1">Dòng sẽ bị bỏ qua:</p>
                      {importPreview.invalidSample.map(item => <p key={item.rowNumber}>Hàng {item.rowNumber}: {item.reason}</p>)}
                    </div>
                  )}
                </div>
              )}

              {importResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium text-green-800">{importResult.message}</p>
                  <p className="text-xs text-green-600">Sheet đã dùng: {importResult.sheetUsed}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <p><strong>Cấu trúc cột Sales (A→K):</strong></p>
                <p>STT | Tên lead | SĐT | Email | Nguồn | Giai đoạn | Giá trị | Người phụ trách | Hành động tiếp theo | Ngày tiếp theo | Ghi chú</p>
                <p>• Giai đoạn: Mới, Đang tư vấn, Báo giá, Đặt cọc, Chốt đơn hoặc Thua.</p>
                <p>• Lead trùng SĐT sẽ được cập nhật, không tạo thêm bản sao.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-sm">Đóng</button>
              {importPreview ? (
                <button onClick={() => handleGoogleSheetImport('import')} disabled={importLoading || importPreview.validLeads === 0} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50">
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  {importLoading ? 'Đang import...' : `Xác nhận import ${importPreview.validLeads} lead`}
                </button>
              ) : (
                <button onClick={() => handleGoogleSheetImport('preview')} disabled={importLoading || !googleSheetUrl.trim() || !googleSheetName} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50">
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {importLoading ? 'Đang kiểm tra...' : 'Kiểm tra dữ liệu'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
