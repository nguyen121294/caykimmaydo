'use client';
import { useEffect, useState } from 'react';
import { Package, ClipboardCheck, Camera, Clock, CheckCircle, AlertCircle, Plus, Download, DollarSign, Wallet, Coins } from 'lucide-react';
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
  const [showOrderForm, setShowOrderForm] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      const json = await res?.json?.();
      setData(json ?? { orders: [], checklists: [] });
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const orders = data?.orders ?? [];
  const checklists = data?.checklists ?? [];

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o?.total ?? 0), 0);
  const totalDeposit = orders.reduce((sum: number, o: any) => sum + Number(o?.deposit ?? 0), 0);
  const totalRemain = totalRevenue - totalDeposit;

  async function handleAddOrder(form: any) {
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Lỗi');
      toast.success('Đã thêm đơn hàng mới');
      setShowOrderForm(false);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message ?? 'Lỗi thêm đơn');
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
                      <div className="text-xs text-gray-500">{o?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o?.product ?? ''}</div>
                      {o?.productType && <div className="text-xs text-gray-500">{o.productType}</div>}
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

      {showOrderForm && (
        <OrderForm onClose={() => setShowOrderForm(false)} onSave={handleAddOrder} />
      )}
    </div>
  );
}

function OrderForm({ onClose, onSave }: { onClose: () => void; onSave: (form: any) => void }) {
  const [form, setForm] = useState<any>({
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
    department: 'Tư vấn / Sale',
    status: 'Mới nhận',
    note: '',
  });

  function submit(e: any) {
    e.preventDefault();
    if (!form.customerName || !form.phone || !form.product || !form.deliveryDate) {
      toast.error('Vui lòng nhập tên khách, SDT, sản phẩm và ngày giao');
      return;
    }
    if (Number(form.deposit ?? 0) > Number(form.total ?? 0)) {
      toast.error('Tiền cọc không được lớn hơn tổng giá trị');
      return;
    }
    onSave(form);
  }

  const remain = Number(form.total || 0) - Number(form.deposit || 0);

  return (
    <Modal title="Thêm đơn hàng mới" onClose={onClose}>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Tên khách hàng *" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
        <Input label="Số điện thoại *" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Input label="Sản phẩm *" value={form.product} onChange={(v) => setForm({ ...form, product: v })} placeholder="VD: Áo dài thêu hoa sen" />
        <Select label="Loại sản phẩm" value={form.productType} options={productTypes} onChange={(v) => setForm({ ...form, productType: v })} />
        <Input label="Số lượng" type="number" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
        <Input label="Tổng giá trị (VND)" type="number" value={form.total} onChange={(v) => setForm({ ...form, total: v })} />
        <Input label="Tiền cọc (VND)" type="number" value={form.deposit} onChange={(v) => setForm({ ...form, deposit: v })} />
        <Input label="Còn lại phải thu" value={formatMoney(remain)} disabled />
        <Input label="Ngày nhận đơn" type="date" value={form.orderDate} onChange={(v) => setForm({ ...form, orderDate: v })} />
        <Input label="Ngày hẹn thử" type="date" value={form.tryDate} onChange={(v) => setForm({ ...form, tryDate: v })} />
        <Input label="Ngày giao hàng *" type="date" value={form.deliveryDate} onChange={(v) => setForm({ ...form, deliveryDate: v })} />
        <Select label="Bộ phận phụ trách" value={form.department} options={departments} onChange={(v) => setForm({ ...form, department: v })} />
        <Select label="Trạng thái" value={form.status} options={orderStatuses} onChange={(v) => setForm({ ...form, status: v })} />
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
