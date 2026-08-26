'use client';
import { useCallback, useEffect, useState } from 'react';
import { Package, ClipboardCheck, Camera, Clock, CheckCircle, AlertCircle, Plus, Download, DollarSign, Wallet, Coins, FileSpreadsheet, Link2, Loader2, RefreshCw, Search, Trash2, Receipt, CreditCard, Scissors, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/app/components/page-header';
import { Modal, Input, Select } from '@/app/components/form-controls';
import { formatMoney } from '@/lib/utils';

const orderStatuses = [
  'Mới nhận',
  'Đang lấy số đo',
  'Đang cắt vải',
  'Đang may',
  'Đang thử đồ',
  'Chỉnh sửa',
  'Hoàn thiện',
  'Đã giao',
  'Hủy',
];

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

const productTypes = ['Áo dài', 'Vest', 'Đầm', 'Sơ mi', 'Quần', 'Khác'];

interface OrderImportPreview {
  totalRows: number;
  validOrders: number;
  newOrders: number;
  duplicateOrders: number;
  repeatedInSheet: number;
  invalidRows: number;
  skippedEmpty: number;
  duplicateSample: Array<{ rowNumber: number; orderId: string; customerName: string }>;
  invalidSample: Array<{ rowNumber: number; reason: string }>;
}

interface OrderImportResult {
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  sheetUsed: string;
}

function clientErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
}

// formatMoney imported from @/lib/utils

function getStatusBadge(status: string) {
  if (status?.includes?.('giao')) return 'bg-emerald-100 text-emerald-700';
  if (status?.includes?.('may') || status?.includes?.('May') || status?.includes?.('thử')) return 'bg-amber-100 text-amber-700';
  if (status?.includes?.('Mới') || status?.includes?.('đo')) return 'bg-blue-100 text-blue-700';
  if (status?.includes?.('Hủy')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function OrdersContent() {
  const [data, setData] = useState<any>({ orders: [], checklists: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [missingPhoneOnly, setMissingPhoneOnly] = useState(false);
  const [initialCustomerId, setInitialCustomerId] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleSheetNames, setGoogleSheetNames] = useState<string[]>([]);
  const [googleSheetName, setGoogleSheetName] = useState('');
  const [importStartRow, setImportStartRow] = useState('2');
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<OrderImportPreview | null>(null);
  const [importResult, setImportResult] = useState<OrderImportResult | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (orderSearch.trim()) params.set('q', orderSearch.trim());
      if (missingPhoneOnly) params.set('missingPhone', 'true');
      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res?.json?.();
      setData(json ?? { orders: [], checklists: [] });
    } catch {} finally { setLoading(false); }
  }, [statusFilter, orderSearch, missingPhoneOnly]);

  useEffect(() => {
    const timer = window.setTimeout(fetchData, 250);
    return () => window.clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    const customerId = new URLSearchParams(window.location.search).get('customerId') ?? '';
    if (customerId) {
      setInitialCustomerId(customerId);
      setShowOrderForm(true);
    }
  }, []);

  const orders = data?.orders ?? [];
  const checklists = data?.checklists ?? [];

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o?.total ?? 0), 0);
  const totalDeposit = orders.reduce((sum: number, o: any) => sum + Number(o?.deposit ?? 0), 0);
  const totalRemain = totalRevenue - totalDeposit;

  async function handleAddOrder(payload: { orderData: any; files?: Array<{ type: string; file: File }> } | any) {
    try {
      const orderData = payload.orderData ?? payload;
      const files = payload.files ?? [];

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Lỗi tạo đơn hàng');

      const createdOrder = json?.order;
      if (files.length > 0 && createdOrder?.id) {
        let uploadedCount = 0;
        for (const item of files) {
          try {
            const fd = new FormData();
            fd.append('file', item.file);
            fd.append('type', item.type);
            const uploadRes = await fetch(`/api/orders/${createdOrder.id}/assets/upload`, {
              method: 'POST',
              body: fd,
            });
            if (uploadRes.ok) uploadedCount++;
          } catch (uploadErr) {
            console.error('Upload asset error:', uploadErr);
          }
        }
        if (uploadedCount > 0) {
          toast.success(`Đã tạo đơn ${createdOrder.orderId || ''} và tải lên ${uploadedCount} ảnh thành công!`);
        } else {
          toast.success(`Đã tạo đơn ${createdOrder.orderId || ''} thành công!`);
        }
      } else {
        if (!orderData.phone || orderData.phone === '1111111111') {
          toast.success(`Đã tạo đơn ${createdOrder?.orderId || ''} thành công (chưa có SĐT nên chưa tạo hồ sơ CRM).`);
        } else {
          toast.success(`Đã tạo đơn ${createdOrder?.orderId || ''} và đồng bộ CRM thành công!`);
        }
      }

      setShowOrderForm(false);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? 'Lỗi thêm đơn');
    }
  }

  async function handleCompletePhone(order: any) {
    const phone = window.prompt(`Nhập SĐT thật cho ${order.customerName}:`, '');
    if (phone === null || !phone.trim()) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Không thể cập nhật SĐT');
      if (json?.order?.needsCustomerPhone) throw new Error('SĐT chưa hợp lệ, vui lòng nhập đủ 10 số.');
      toast.success('Đã cập nhật SĐT và liên kết CRM');
      fetchData();
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    }
  }

  async function loadGoogleSheetNames() {
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
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Không thể tải danh sách Sheet/Tab');
      setGoogleSheetNames(json.sheetNames);
      if (json.sheetNames.length === 1) setGoogleSheetName(json.sheetNames[0]);
      toast.success(`Đã tìm thấy ${json.sheetNames.length} Sheet/Tab`);
    } catch (error: unknown) {
      const message = clientErrorMessage(error);
      setImportError(message);
      toast.error(message);
    } finally {
      setSheetListLoading(false);
    }
  }

  async function handleGoogleSheetImport(action: 'preview' | 'import') {
    if (!googleSheetUrl.trim()) { toast.error('Vui lòng dán link Google Sheet'); return; }
    if (!googleSheetName) { toast.error('Vui lòng chọn đúng Sheet/Tab Orders'); return; }
    setImportLoading(true);
    setImportError(null);
    if (action === 'preview') { setImportPreview(null); setImportResult(null); }
    try {
      const res = await fetch('/api/orders/import-google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          spreadsheetUrl: googleSheetUrl,
          sheetName: googleSheetName,
          startRow: importStartRow || '2',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Không thể import Google Sheet');
      if (action === 'preview') {
        setImportPreview(json.preview);
        toast.success('Đã kiểm tra dữ liệu Orders và mã đơn trùng');
      } else {
        setImportResult(json);
        setImportPreview(null);
        toast.success(json.message);
        fetchData();
      }
    } catch (error: unknown) {
      const message = clientErrorMessage(error);
      setImportError(message);
      toast.error(message);
    } finally {
      setImportLoading(false);
    }
  }

  function exportCSV() {
    const headers = [
      'Mã đơn hàng',
      'Tên khách hàng',
      'Số điện thoại',
      'Sản phẩm',
      'Loại sản phẩm',
      'Số lượng',
      'Tổng giá trị',
      'Tiền cọc',
      'Còn lại',
      'Ngày nhận đơn',
      'Ngày hẹn thử',
      'Ngày giao hàng',
      'Trạng thái',
      'Bộ phận phụ trách',
      'Ghi chú',
    ];
    const rows = orders.map((o: any) => [
      o?.orderId ?? '',
      o?.customerName ?? '',
      o?.phone ?? '',
      o?.product ?? '',
      o?.productType ?? '',
      o?.quantity ?? '',
      o?.total ?? '',
      o?.deposit ?? '',
      Number(o?.total ?? 0) - Number(o?.deposit ?? 0),
      o?.orderDate ?? '',
      o?.tryDate ?? '',
      o?.deliveryDate ?? '',
      o?.status ?? '',
      o?.department ?? '',
      o?.notes ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `du-lieu-don-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Đã xuất file CSV');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Đơn Hàng & Sản Xuất"
        description="Quản lý đơn hàng, doanh thu, tiền cọc và tiến độ"
        icon={Package}
        onRefresh={fetchData}
      />

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setShowOrderForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all"
        >
          <Plus size={16} /> Thêm đơn hàng
        </button>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:shadow-md transition-all"
        >
          <Download size={16} /> Xuất CSV / Excel
        </button>
        <button
          onClick={() => { setShowImport(true); setImportError(null); setImportPreview(null); setImportResult(null); }}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          <FileSpreadsheet size={16} /> Import Google Sheet
        </button>
        <select
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e?.target?.value ?? '')}
          className="px-3 py-2.5 text-sm bg-white rounded-lg shadow-sm border-0 outline-none ml-auto"
        >
          <option value="">Tất cả trạng thái</option>
          {orderStatuses?.map?.((s: string) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="relative min-w-[220px]">
          <Search size={15} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder="Tìm mã, khách, SĐT..."
            className="w-full rounded-lg bg-white py-2.5 pl-9 pr-3 text-sm shadow-sm outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => { setMissingPhoneOnly(value => !value); if (!missingPhoneOnly) setOrderSearch('1111111111'); }}
          className={`rounded-lg px-3 py-2.5 text-sm font-medium shadow-sm ${missingPhoneOnly ? 'bg-amber-500 text-white' : 'bg-white text-amber-700'}`}
        >
          Cần bổ sung SĐT
        </button>
        <div className="text-sm text-gray-500">{orders?.length ?? 0} đơn hàng</div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Tổng doanh thu</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">{formatMoney(totalRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Tổng tiền cọc</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">{formatMoney(totalDeposit)}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-sm border border-amber-100">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">Còn lại phải thu</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{formatMoney(totalRemain)}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Tổng đơn</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{orders?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">Đang may</span>
          </div>
          <p className="text-xl font-bold text-amber-600">
            {orders?.filter?.((o: any) => (o?.status ?? '')?.toLowerCase?.()?.includes?.('may'))?.length ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">Đã giao</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {orders?.filter?.((o: any) => (o?.status ?? '')?.includes?.('giao'))?.length ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">Có Hình Ảnh</span>
          </div>
          <p className="text-xl font-bold text-purple-600">{orders?.filter?.((o: any) => o?.hasMedia === 'Yes')?.length ?? 0}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-sm font-semibold text-gray-700">Danh Sách Đơn Hàng</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Mã</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Khách</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Sản phẩm</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">SL</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Tổng</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Cọc</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Còn lại</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ngày giao</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Bộ phận</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(orders ?? [])?.map?.((o: any) => {
                const remain = Number(o?.total ?? 0) - Number(o?.deposit ?? 0);
                return (
                  <tr key={o?.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{o?.orderId ?? ''}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o?.customerName ?? ''}</div>
                      <div className={`text-xs ${o?.needsCustomerPhone ? 'font-semibold text-amber-600' : 'text-gray-500'}`}>
                        {o?.phone ?? ''}{o?.needsCustomerPhone ? ' · Cần bổ sung' : ''}
                      </div>
                      {o?.needsCustomerPhone && (
                        <button type="button" onClick={() => handleCompletePhone(o)} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline">
                          Bổ sung SĐT
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>{o?.product ?? ''}</div>
                      {o?.productType && <div className="text-xs text-gray-500">{o.productType}</div>}
                      {Array.isArray(o?.assets) && o.assets.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {o.assets.map((asset: any) => (
                            <a key={asset.id} href={asset.url} target="_blank" rel="noreferrer" className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 hover:bg-purple-100">
                              {asset.type === 'PRODUCT' ? 'Hình SP' : asset.type === 'DEPOSIT_BILL' ? 'Bill cọc' : asset.type === 'BALANCE_BILL' ? 'Bill còn lại' : 'Bill vải'}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{o?.quantity ?? 1}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(o?.total)}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{formatMoney(o?.deposit)}</td>
                    <td className="px-4 py-3 text-right text-amber-600 font-medium">{formatMoney(remain)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{o?.deliveryDate ?? o?.expectedDate ?? ''}</td>
                    <td className="px-4 py-3 text-xs">{o?.department ?? ''}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(o?.status ?? '')}`}>{o?.status ?? ''}</span>
                    </td>
                  </tr>
                );
              }) ?? []}
              {orders?.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">Chưa có đơn hàng nào. Nhấn &quot;Thêm đơn hàng&quot; để bắt đầu.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tailor Checklist */}
      {(checklists ?? [])?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-purple-500" />
              Checklist Thợ May
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Mã đơn</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Thợ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Loại media</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Yêu cầu</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Deadline</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Đã gửi</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Chất lượng</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(checklists ?? [])?.map?.((c: any, i: number) => (
                  <tr key={c?.id ?? i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{c?.orderId ?? ''}</td>
                    <td className="px-4 py-3">{c?.tailorName ?? ''}</td>
                    <td className="px-4 py-3 text-xs">{c?.mediaType ?? ''}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate">{c?.description ?? ''}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c?.deadline ?? ''}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (c?.submitted ?? '')?.includes?.('Đã') ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                      }`}>{c?.submitted ?? 'Chưa'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{c?.quality ?? '—'}</td>
                  </tr>
                )) ?? []}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && (
        <Modal title="Import / cập nhật Orders từ Google Sheet" onClose={() => setShowImport(false)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="orders-google-sheet-url" className="mb-1.5 block text-xs font-semibold text-gray-700">Link Google Sheet công khai</label>
              <div className="relative">
                <Link2 size={15} className="absolute left-3 top-3 text-gray-400" />
                <input
                  id="orders-google-sheet-url"
                  type="url"
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={googleSheetUrl}
                  onChange={(e) => { setGoogleSheetUrl(e.target.value); setGoogleSheetNames([]); setGoogleSheetName(''); setImportPreview(null); setImportResult(null); setImportError(null); }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Dùng được cùng link với CRM và Sales; chọn riêng tab Orders bên dưới.</p>
              <button
                type="button"
                onClick={loadGoogleSheetNames}
                disabled={sheetListLoading || !googleSheetUrl.trim()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {sheetListLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {sheetListLoading ? 'Đang tải danh sách...' : 'Tải danh sách Sheet/Tab'}
              </button>
            </div>

            {googleSheetNames.length > 0 && (
              <div>
                <label htmlFor="orders-google-sheet-name" className="mb-1.5 block text-xs font-semibold text-gray-700">Chọn Sheet/Tab Orders *</label>
                <select
                  id="orders-google-sheet-name"
                  className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  value={googleSheetName}
                  onChange={(e) => { setGoogleSheetName(e.target.value); setImportPreview(null); setImportResult(null); setImportError(null); }}
                >
                  <option value="">-- Chọn đúng tab dữ liệu Orders --</option>
                  {googleSheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="orders-import-start-row" className="mb-1.5 block text-xs font-semibold text-gray-700">Dữ liệu bắt đầu từ hàng</label>
              <input
                id="orders-import-start-row"
                type="number"
                min="2"
                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={importStartRow}
                onChange={(e) => { setImportStartRow(e.target.value); setImportPreview(null); setImportResult(null); }}
              />
              <p className="mt-1 text-xs text-gray-500">Hàng tiêu đề phải nằm ngay phía trên. Ví dụ tiêu đề ở hàng 4 thì nhập dữ liệu bắt đầu từ hàng 5.</p>
            </div>

            {importError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-700">{importError}</p>
              </div>
            )}

            {importPreview && (
              <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Kết quả kiểm tra tab “{googleSheetName}”</p>
                  <p className="mt-0.5 text-xs text-blue-700">Tìm thấy {importPreview.validOrders} đơn hợp lệ từ {importPreview.totalRows} dòng dữ liệu.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-gray-500">Đơn mới</p><p className="text-lg font-bold text-emerald-600">{importPreview.newOrders}</p></div>
                  <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-gray-500">Cập nhật</p><p className="text-lg font-bold text-amber-600">{importPreview.duplicateOrders}</p></div>
                  <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-gray-500">Trùng trong Sheet</p><p className="text-lg font-bold text-amber-600">{importPreview.repeatedInSheet}</p></div>
                  <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-gray-500">Không hợp lệ</p><p className="text-lg font-bold text-red-600">{importPreview.invalidRows}</p></div>
                </div>
                {importPreview.duplicateSample.length > 0 && (
                  <div className="text-xs text-amber-800">
                    <p className="mb-1 font-medium">Đơn sẽ được cập nhật theo mã:</p>
                    {importPreview.duplicateSample.map(item => <p key={`${item.rowNumber}-${item.orderId}`}>Hàng {item.rowNumber}: {item.orderId} · {item.customerName}</p>)}
                  </div>
                )}
                {importPreview.invalidSample.length > 0 && (
                  <div className="text-xs text-red-700">
                    <p className="mb-1 font-medium">Dòng sẽ bị bỏ qua:</p>
                    {importPreview.invalidSample.map(item => <p key={item.rowNumber}>Hàng {item.rowNumber}: {item.reason}</p>)}
                  </div>
                )}
              </div>
            )}

            {importResult && (
              <div className="space-y-1 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">{importResult.message}</p>
                <p className="text-xs text-green-600">Sheet đã dùng: {importResult.sheetUsed}</p>
              </div>
            )}

            <div className="space-y-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <p><strong>Cột bắt buộc:</strong> Mã đơn hàng, Tên khách hàng, Sản phẩm.</p>
              <p>Hệ thống nhận cả cấu trúc Excel Orders gốc và cấu trúc file xuất từ nút “Xuất CSV / Excel”.</p>
              <p>Đơn trùng mã sẽ chỉ cập nhật các cột có dữ liệu trong Sheet; các cột không có sẽ được giữ nguyên.</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowImport(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700">Đóng</button>
              {importPreview ? (
                <button
                  onClick={() => handleGoogleSheetImport('import')}
                  disabled={importLoading || importPreview.validOrders === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                  {importLoading ? 'Đang import...' : `Xác nhận cập nhật ${importPreview.validOrders} đơn`}
                </button>
              ) : (
                <button
                  onClick={() => handleGoogleSheetImport('preview')}
                  disabled={importLoading || !googleSheetUrl.trim() || !googleSheetName}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  {importLoading ? 'Đang kiểm tra...' : 'Kiểm tra dữ liệu'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showOrderForm && (
        <OrderForm initialCustomerId={initialCustomerId} onClose={() => { setShowOrderForm(false); setInitialCustomerId(''); }} onSave={handleAddOrder} />
      )}
    </div>
  );
}

function ImageUploadBox({
  label,
  file,
  onChange,
  onRemove,
  icon: Icon,
  accept = 'image/*',
}: {
  label: string;
  file: File | null;
  onChange: (file: File) => void;
  onRemove: () => void;
  icon: any;
  accept?: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-gray-700">{label}</span>
      {file && previewUrl ? (
        <div className="relative flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2.5">
          <img src={previewUrl} alt={file.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-900">{file.name}</p>
            <p className="text-[11px] text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Xóa ảnh"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-3 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/30">
          <Icon size={20} className="text-gray-400" />
          <span className="text-xs font-medium text-indigo-600 hover:underline">Chọn hoặc kéo thả ảnh</span>
          <span className="text-[10px] text-gray-400">PNG, JPG, WebP (&lt; 4MB)</span>
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) {
                if (selected.size > 4 * 1024 * 1024) {
                  toast.error('Kích thước ảnh vượt quá 4MB');
                  return;
                }
                onChange(selected);
              }
            }}
          />
        </label>
      )}
    </div>
  );
}

function OrderForm({ initialCustomerId, onClose, onSave }: { initialCustomerId: string; onClose: () => void; onSave: (payload: any) => void }) {
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone: string | null }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productFile, setProductFile] = useState<File | null>(null);
  const [depositBillFile, setDepositBillFile] = useState<File | null>(null);
  const [balanceBillFile, setBalanceBillFile] = useState<File | null>(null);
  const [fabricBillFile, setFabricBillFile] = useState<File | null>(null);
  const [form, setForm] = useState<any>({
    customerId: initialCustomerId,
    customerName: '',
    phone: '',
    product: '',
    productType: 'Áo dài',
    quantity: 1,
    total: '',
    deposit: '',
    orderDate: '',
    tryDate: '',
    deliveryDate: '',
    deliveryAddress: '',
    salesOwnerId: '',
    fabricCost: '',
    tailorCost: '',
    shippingFee: '',
    department: 'Tư vấn / Sale',
    status: 'Mới nhận',
    note: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/customers?limit=500').then(res => res.ok ? res.json() : []),
      fetch('/api/users').then(res => res.ok ? res.json() : []),
    ]).then(([customerRows, userRows]) => {
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
      setUsers(Array.isArray(userRows) ? userRows : []);
      if (initialCustomerId) {
        const selected = customerRows.find((customer: any) => customer.id === initialCustomerId);
        if (selected) setForm((current: any) => ({ ...current, customerId: selected.id, customerName: selected.name, phone: selected.phone ?? '' }));
      }
    }).catch(() => undefined);
  }, [initialCustomerId]);

  const filteredCustomers = customers.filter(customer => {
    const query = customerSearch.trim().toLocaleLowerCase('vi');
    return !query || customer.name.toLocaleLowerCase('vi').includes(query) || customer.phone?.includes(query);
  }).slice(0, 50);

  function selectCustomer(customerId: string) {
    const customer = customers.find(item => item.id === customerId);
    setForm({
      ...form,
      customerId,
      customerName: customer?.name ?? '',
      phone: customer?.phone ?? '',
    });
  }

  function submit(e: any) {
    e.preventDefault();
    if (!form.customerName || !form.product || !form.deliveryDate) {
      toast.error('Vui lòng nhập tên khách, sản phẩm và ngày giao');
      return;
    }
    if (Number(form.deposit ?? 0) > Number(form.total ?? 0)) {
      toast.error('Tiền cọc không được lớn hơn tổng giá trị');
      return;
    }

    const selectedFiles: Array<{ type: string; file: File }> = [];
    if (productFile) selectedFiles.push({ type: 'PRODUCT', file: productFile });
    if (depositBillFile) selectedFiles.push({ type: 'DEPOSIT_BILL', file: depositBillFile });
    if (balanceBillFile) selectedFiles.push({ type: 'BALANCE_BILL', file: balanceBillFile });
    if (fabricBillFile) selectedFiles.push({ type: 'FABRIC_BILL', file: fabricBillFile });

    onSave({ orderData: form, files: selectedFiles });
  }

  const remain = Number(form.total || 0) - Number(form.deposit || 0);

  return (
    <Modal title="Thêm đơn hàng mới" onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
          <label className="mb-1 block text-xs font-semibold text-indigo-900">Chọn khách đã có trong CRM</label>
          <input
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Gõ tên hoặc SĐT để lọc..."
            className="mb-2 w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm outline-none"
          />
          <select value={form.customerId} onChange={(e) => selectCustomer(e.target.value)} className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm">
            <option value="">Khách mới — nhập thông tin bên dưới</option>
            {filteredCustomers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone || 'chưa có SĐT'}</option>)}
          </select>
          <p className="mt-1.5 text-xs text-indigo-700">Khách mới có SĐT hợp lệ sẽ tự tạo trong CRM. Thiếu SĐT sẽ lưu là 1111111111 và chưa tạo CRM.</p>
        </div>
        <Input label="Tên khách hàng *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
        
        <div className="space-y-1">
          <Input label="Số điện thoại" value={form.phone} onChange={(v) => setForm({ ...form, customerId: '', phone: v })} placeholder="Để trống nếu chưa có" />
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-600" />
            <span><strong>Lưu ý:</strong> Không có SĐT thì đơn hàng vẫn được lưu đầy đủ nhưng CRM <strong>chưa tạo hồ sơ</strong> (để tránh trùng lặp). Bổ sung SĐT sau sẽ tự tạo CRM.</span>
          </div>
        </div>

        <Input label="Sản phẩm *" value={form.product} onChange={(v) => setForm({ ...form, product: v })} placeholder="VD: Áo dài thêu hoa sen" />
        <Select label="Loại sản phẩm" value={form.productType} options={productTypes} onChange={(v) => setForm({ ...form, productType: v })} />
        <Input label="Số lượng" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
        <Input label="Tổng giá trị (VND)" type="number" value={form.total} onChange={(v) => setForm({ ...form, total: v })} />
        <Input label="Tiền cọc (VND)" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <Input label="Còn lại phải thu" value={formatMoney(remain)} disabled />
        <Input label="Ngày nhận đơn" type="date" value={form.orderDate} onChange={(v) => setForm({ ...form, orderDate: v })} />
        <Input label="Ngày hẹn thử" type="date" value={form.tryDate} onChange={(v) => setForm({ ...form, tryDate: v })} />
        <Input label="Ngày giao hàng *" type="date" value={form.deliveryDate} onChange={(v) => setForm({ ...form, deliveryDate: v })} />
        <Input label="Địa chỉ giao" value={form.deliveryAddress} onChange={(v) => setForm({ ...form, deliveryAddress: v })} />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-gray-700">Nhân viên xử lý</span>
          <select value={form.salesOwnerId} onChange={(e) => setForm({ ...form, salesOwnerId: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm">
            <option value="">Tự động: người đang tạo</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
          </select>
        </label>
        <Select label="Bộ phận phụ trách" value={form.department} options={departments} onChange={(v) => setForm({ ...form, department: v })} />
        <Select label="Trạng thái" value={form.status} options={orderStatuses} onChange={(v) => setForm({ ...form, status: v })} />
        <Input label="Chi phí vải thực tế" type="number" value={form.fabricCost} onChange={(v) => setForm({ ...form, fabricCost: v })} />
        <Input label="Tiền công may" type="number" value={form.tailorCost} onChange={(v) => setForm({ ...form, tailorCost: v })} />
        <Input label="Phí ship" type="number" value={form.shippingFee} onChange={(v) => setForm({ ...form, shippingFee: v })} />

        {/* Direct Image Upload Fields */}
        <div className="md:col-span-2 border-t border-gray-100 pt-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
            <Camera size={14} className="text-indigo-600" /> Tải lên hình ảnh &amp; Bill đính kèm
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUploadBox
              label="1. Ảnh mẫu sản phẩm"
              file={productFile}
              onChange={setProductFile}
              onRemove={() => setProductFile(null)}
              icon={Camera}
            />
            <ImageUploadBox
              label="2. Bill đặt cọc"
              file={depositBillFile}
              onChange={setDepositBillFile}
              onRemove={() => setDepositBillFile(null)}
              icon={CreditCard}
            />
            <ImageUploadBox
              label="3. Bill tất toán còn lại"
              file={balanceBillFile}
              onChange={setBalanceBillFile}
              onRemove={() => setBalanceBillFile(null)}
              icon={Receipt}
            />
            <ImageUploadBox
              label="4. Bill tiền vải"
              file={fabricBillFile}
              onChange={setFabricBillFile}
              onRemove={() => setFabricBillFile(null)}
              icon={Scissors}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Input label="Ghi chú" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
        </div>
        <div className="md:col-span-2 flex gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md">
            Lưu đơn hàng
          </button>
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
            Hủy
          </button>
        </div>
      </form>
    </Modal>
  );
}
