'use client';
import { useState, useCallback } from 'react';
import { FileSpreadsheet, Upload, Download, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type ModuleKey = 'customers' | 'orders' | 'leads' | 'finance';

const modules: { key: ModuleKey; label: string; api: string }[] = [
  { key: 'customers', label: 'Khách hàng (CRM)', api: '/api/customers' },
  { key: 'orders', label: 'Đơn hàng', api: '/api/orders' },
  { key: 'leads', label: 'Sales Pipeline (Leads)', api: '/api/leads' },
  { key: 'finance', label: 'Tài chính', api: '/api/finance' },
];

export default function ImportExportContent() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('customers');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const mod = modules.find(m => m.key === activeModule);
      if (!mod) return;
      const res = await fetch(mod.api);
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) { toast.error('Không có dữ liệu để xuất'); return; }

      const headers = Object.keys(data[0]).filter(k => k !== 'updatedAt');
      const rows = data.map((item: any) => headers.map(h => {
        const val = item[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }).join(','));
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${activeModule}_export.csv`;
      a.click();
      toast.success(`Xuất ${data.length} dòng thành công!`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi xuất dữ liệu');
    } finally { setExporting(false); }
  }, [activeModule]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { toast.error('File rỗng hoặc không hợp lệ'); return; }

      const headers = lines[0].replace(/\uFEFF/, '').split(',').map(h => h.trim());
      const mod = modules.find(m => m.key === activeModule);
      if (!mod) return;

      let success = 0;
      let failed = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => { if (values[idx]) row[h] = values[idx]; });

        // Skip id, createdAt, updatedAt
        delete row.id; delete row.createdAt; delete row.updatedAt;

        // Convert numbers
        if (row.totalOrders) row.totalOrders = parseInt(row.totalOrders) || 0;
        if (row.totalSpent) row.totalSpent = parseFloat(row.totalSpent) || 0;
        if (row.value) row.value = parseFloat(row.value) || 0;
        if (row.amount) row.amount = parseFloat(row.amount) || 0;
        if (row.total) row.total = parseFloat(row.total) || 0;
        if (row.deposit) row.deposit = parseFloat(row.deposit) || 0;
        if (row.quantity) row.quantity = parseInt(row.quantity) || 1;

        try {
          const res = await fetch(mod.api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(row)
          });
          if (res.ok) success++; else failed++;
        } catch { failed++; }
      }

      setImportResult({ success, failed });
      toast.success(`Nhập xong: ${success} thành công, ${failed} lỗi`);
    } catch (err: any) {
      toast.error('Lỗi nhập dữ liệu: ' + (err.message || ''));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }, [activeModule]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="text-indigo-600" size={28} /> Import / Export Dữ Liệu
        </h1>
        <p className="text-slate-500 text-sm mt-1">Nhập và xuất dữ liệu dạng CSV cho từng module</p>
      </div>

      {/* Module selector */}
      <div className="flex flex-wrap gap-2">
        {modules.map(m => (
          <button key={m.key} onClick={() => { setActiveModule(m.key); setImportResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeModule === m.key ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><Download className="text-emerald-600" size={20} /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Xuất dữ liệu (Export)</h3>
              <p className="text-xs text-slate-500">Tải về file CSV mã UTF-8</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Xuất toàn bộ dữ liệu <strong>{modules.find(m => m.key === activeModule)?.label}</strong> ra file CSV.
            File sẽ bao gồm BOM marker để hiển thị đúng tiếng Việt trong Excel.
          </p>
          <button onClick={handleExport} disabled={exporting}
            className="w-full px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-2">
            {exporting ? <><RefreshCw size={14} className="animate-spin" /> Đang xuất...</> : <><Download size={14} /> Xuất CSV</>}
          </button>
        </div>

        {/* Import */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Upload className="text-blue-600" size={20} /></div>
            <div>
              <h3 className="font-semibold text-slate-900">Nhập dữ liệu (Import)</h3>
              <p className="text-xs text-slate-500">Upload file CSV để thêm dữ liệu</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Chọn file CSV để nhập vào <strong>{modules.find(m => m.key === activeModule)?.label}</strong>.
            Dòng đầu tiên là header. Mỗi dòng tiếp theo là một bản ghi mới.
          </p>
          <label className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer">
            {importing ? <><RefreshCw size={14} className="animate-spin" /> Đang nhập...</> : <><Upload size={14} /> Chọn file CSV</>}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          {importResult && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 text-sm space-y-1">
              <p className="flex items-center gap-2 text-emerald-700"><CheckCircle size={14} /> Thành công: {importResult.success}</p>
              {importResult.failed > 0 && <p className="flex items-center gap-2 text-red-600"><AlertCircle size={14} /> Lỗi: {importResult.failed}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Hướng dẫn Import/Export</h3>
        <div className="text-sm text-slate-600 space-y-2">
          <p><strong>1. Xuất dữ liệu:</strong> Bấm "Xuất CSV" để tải file. Mở bằng Excel hoặc Google Sheets.</p>
          <p><strong>2. Chỉnh sửa:</strong> Sửa dữ liệu trong Excel/Google Sheets. Giữ nguyên header.</p>
          <p><strong>3. Nhập lại:</strong> Lưu lại dạng CSV (UTF-8), rồi upload lên lại.</p>
          <p><strong>Lưu ý:</strong> Hệ thống sẽ tự động bỏ qua cột id, createdAt, updatedAt khi import.</p>
        </div>
      </div>
    </div>
  );
}
