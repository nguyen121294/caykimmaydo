'use client';
import { formatMoney as fmt } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';
import { UserCheck, Plus, Search, Phone, Mail, Tag, RefreshCw, X, FileSpreadsheet, Star, Gift, Award, History, ChevronDown, ChevronUp, Loader2, AlertCircle, Crown, Link2, ShoppingCart, Pencil, MapPin, Instagram, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zaloId: string | null;
  source: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrder: string | null;
  tags: string | null;
  notes: string | null;
  status: string;
  loyaltyPoints: number;
  loyaltyTier: string;
  lastPurchaseDate: string | null;
  contactAccount: string | null;
  address: string | null;
  createdAt: string;
}

interface LoyaltyTx {
  id: string;
  type: string;
  points: number;
  amount: number | null;
  description: string | null;
  createdAt: string;
}

interface SheetPreview {
  totalRows: number;
  validCustomers: number;
  newCustomers: number;
  duplicateCustomers: number;
  repeatedInSheet: number;
  invalidRows: number;
  skippedEmpty: number;
  duplicateSample: Array<{ rowNumber: number; name: string; phone: string }>;
  invalidSample: Array<{ rowNumber: number; reason: string }>;
}

interface ImportResult {
  message: string;
  imported: number;
  updated: number;
  skipped: number;
  sheetUsed?: string;
  availableSheets?: string[];
  errors?: string[];
}

const sourceOptions = ['Instagram', 'Facebook', 'TikTok', 'Zalo', 'Google', 'Google Sheet', 'Giới thiệu', 'Khác'];
const instagramPresets = ['@maydo.official', '@maydo.hn', '@maydo.sg', '@maydo.studio'];
const statusOptions = ['Mới', 'Đang tư vấn', 'Đã mua', 'VIP', 'Không phản hồi'];
const tierOptions = ['New', 'Silver', 'Gold', 'VIP'];

function clientErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định';
}

const tierConfig: Record<string, { color: string; bg: string; icon: typeof Star }> = {
  New: { color: 'text-slate-600', bg: 'bg-slate-100', icon: Star },
  Silver: { color: 'text-slate-500', bg: 'bg-gradient-to-r from-slate-100 to-slate-200', icon: Award },
  Gold: { color: 'text-amber-600', bg: 'bg-gradient-to-r from-amber-50 to-amber-100', icon: Crown },
  VIP: { color: 'text-purple-600', bg: 'bg-gradient-to-r from-purple-50 to-purple-100', icon: Crown },
};

function TierBadge({ tier }: { tier: string }) {
  const cfg = tierConfig[tier] || tierConfig.New;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color} ${cfg.bg}`}>
      <cfg.icon size={10} /> {tier}
    </span>
  );
}

const defaultCustomerForm = {
  name: '',
  phone: '',
  email: '',
  source: 'Instagram',
  contactAccount: '',
  address: '',
  loyaltyTier: 'New',
  loyaltyPoints: 0,
  totalSpent: 0,
  lastPurchaseDate: '',
  status: 'Mới',
  tags: '',
  notes: '',
};

export default function CRMContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterTier, setFilterTier] = useState('all');

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(defaultCustomerForm);
  const [addSaving, setAddSaving] = useState(false);

  // Edit state
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(defaultCustomerForm);
  const [editSaving, setEditSaving] = useState(false);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<'google' | 'file'>('google');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSheet, setImportSheet] = useState('');
  const [importStartRow, setImportStartRow] = useState('2');
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [googleSheetNames, setGoogleSheetNames] = useState<string[]>([]);
  const [googleSheetName, setGoogleSheetName] = useState('');
  const [sheetListLoading, setSheetListLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState<SheetPreview | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Loyalty detail state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTx[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [earnValue, setEarnValue] = useState('');
  const [earnOrderId, setEarnOrderId] = useState('');
  const [earnLoading, setEarnLoading] = useState(false);
  const [redeemLoading, setRedeemLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      if (res.ok) setCustomers(await res.json());
    } catch { toast.error('Lỗi tải dữ liệu'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error('Vui lòng nhập tên khách hàng'); return; }
    setAddSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Lỗi thêm khách hàng');
      toast.success('Thêm khách hàng thành công');
      setShowAdd(false);
      setForm(defaultCustomerForm);
      fetchData();
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditId(customer.id);
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      source: customer.source || 'Instagram',
      contactAccount: customer.contactAccount || '',
      address: customer.address || '',
      loyaltyTier: customer.loyaltyTier || 'New',
      loyaltyPoints: customer.loyaltyPoints || 0,
      totalSpent: customer.totalSpent || 0,
      lastPurchaseDate: customer.lastPurchaseDate || '',
      status: customer.status || 'Mới',
      tags: customer.tags || '',
      notes: customer.notes || '',
    });
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!editId || !editForm.name.trim()) {
      toast.error('Vui lòng nhập tên khách hàng');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editId, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Lỗi cập nhật khách hàng');
      toast.success('Đã cập nhật thông tin khách hàng thành công');
      setShowEdit(false);
      setEditId(null);
      fetchData();
    } catch (error: unknown) {
      toast.error(clientErrorMessage(error));
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch('/api/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      toast.success('Đã cập nhật trạng thái');
    } catch { toast.error('Lỗi cập nhật trạng thái'); }
  };

  // === Import File (Excel/CSV) ===
  const handleImportFile = async (action: 'preview' | 'import') => {
    if (!importFile) { toast.error('Vui lòng chọn file Excel hoặc CSV'); return; }
    setImportLoading(true);
    setImportError(null);
    if (action === 'preview') {
      setSheetPreview(null);
      setImportResult(null);
    }
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      fd.append('sheetName', importSheet || '');
      fd.append('startRow', importStartRow || '2');
      fd.append('action', action);

      const res = await fetch('/api/crm/import-file', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể import file');
      }
      if (action === 'preview') {
        setSheetPreview(data.preview);
        toast.success('Đã kiểm tra dữ liệu và khách trùng');
      } else {
        setImportResult(data);
        setSheetPreview(null);
        toast.success(data.message || `Import thành công ${data.imported} khách hàng`);
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

  const handleGoogleSheet = async (action: 'preview' | 'import') => {
    if (!googleSheetUrl.trim()) { toast.error('Vui lòng dán link Google Sheet'); return; }
    if (!googleSheetName) { toast.error('Vui lòng chọn đúng Sheet/Tab cần import'); return; }
    setImportLoading(true);
    setImportError(null);
    if (action === 'preview') {
      setSheetPreview(null);
      setImportResult(null);
    }
    try {
      const res = await fetch('/api/crm/import-google-sheet', {
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
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể đọc dữ liệu Google Sheet');
      }
      if (action === 'preview') {
        setSheetPreview(data.preview);
        toast.success('Đã kiểm tra dữ liệu và khách trùng');
      } else {
        setImportResult(data);
        setSheetPreview(null);
        toast.success(data.message || `Import thành công ${data.imported} khách hàng`);
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

  const loadGoogleSheetNames = async () => {
    if (!googleSheetUrl.trim()) { toast.error('Vui lòng dán link Google Sheet'); return; }
    setSheetListLoading(true);
    setImportError(null);
    setGoogleSheetNames([]);
    setGoogleSheetName('');
    setSheetPreview(null);
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

  // === Loyalty Functions ===
  const openLoyalty = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowLoyalty(true);
    setLoyaltyLoading(true);
    setEarnValue('');
    setEarnOrderId('');
    try {
      const res = await fetch(`/api/crm/loyalty/history?customerId=${customer.id}`);
      if (res.ok) setLoyaltyHistory(await res.json());
    } catch { /* silent */ } finally { setLoyaltyLoading(false); }
  };

  const handleEarn = async () => {
    if (!selectedCustomer || !earnValue) return;
    setEarnLoading(true);
    try {
      const res = await fetch('/api/crm/loyalty/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, orderId: earnOrderId || undefined, orderValue: Number(earnValue.replace(/\./g, '').replace(/,/g, '')) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast.success(data.message);
      setEarnValue('');
      setEarnOrderId('');
      fetchData();
      openLoyalty({ ...selectedCustomer, loyaltyPoints: data.totalPoints, loyaltyTier: data.tier });
    } catch (error: unknown) { toast.error(clientErrorMessage(error)); } finally { setEarnLoading(false); }
  };

  const handleRedeem = async (points: number) => {
    if (!selectedCustomer) return;
    setRedeemLoading(true);
    try {
      const res = await fetch('/api/crm/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, points }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast.success(data.message);
      fetchData();
      openLoyalty({ ...selectedCustomer, loyaltyPoints: data.remainingPoints, loyaltyTier: data.tier });
    } catch (error: unknown) { toast.error(clientErrorMessage(error)); } finally { setRedeemLoading(false); }
  };

  const normalizedQuery = search.trim().toLowerCase();
  const filtered = customers.filter(c => {
    const matchSearch = !normalizedQuery ||
      c.name?.toLowerCase().includes(normalizedQuery) ||
      (c.phone && c.phone.toLowerCase().includes(normalizedQuery)) ||
      (c.email && c.email.toLowerCase().includes(normalizedQuery)) ||
      (c.address && c.address.toLowerCase().includes(normalizedQuery)) ||
      (c.tags && c.tags.toLowerCase().includes(normalizedQuery)) ||
      (c.notes && c.notes.toLowerCase().includes(normalizedQuery)) ||
      (c.lastOrder && c.lastOrder.toLowerCase().includes(normalizedQuery)) ||
      (c.contactAccount && c.contactAccount.toLowerCase().includes(normalizedQuery)) ||
      (c.zaloId && c.zaloId.toLowerCase().includes(normalizedQuery)) ||
      (c.source && c.source.toLowerCase().includes(normalizedQuery));

    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchSource = filterSource === 'all' || c.source === filterSource;
    const matchTier = filterTier === 'all' || c.loyaltyTier === filterTier;
    return matchSearch && matchStatus && matchSource && matchTier;
  });

  const stats = {
    total: customers.length,
    newCount: customers.filter(c => c.loyaltyTier === 'New').length,
    silver: customers.filter(c => c.loyaltyTier === 'Silver').length,
    gold: customers.filter(c => c.loyaltyTier === 'Gold').length,
    vip: customers.filter(c => c.loyaltyTier === 'VIP').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-indigo-600" size={28} /> CRM Khách Hàng
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý hồ sơ khách hàng, phân loại kênh Instagram & tích điểm thành viên</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Làm mới
          </button>
          <button onClick={() => { setShowImport(true); setImportError(null); setImportResult(null); setSheetPreview(null); setImportFile(null); }} className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5">
            <FileSpreadsheet size={14} /> Import khách hàng
          </button>
          <button onClick={() => { setForm(defaultCustomerForm); setShowAdd(true); }} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5">
            <Plus size={14} /> Thêm khách hàng
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Tổng khách', value: stats.total, color: 'bg-blue-50 text-blue-700' },
          { label: 'New', value: stats.newCount, color: 'bg-slate-50 text-slate-700' },
          { label: 'Silver', value: stats.silver, color: 'bg-slate-100 text-slate-600' },
          { label: 'Gold', value: stats.gold, color: 'bg-amber-50 text-amber-700' },
          { label: 'VIP', value: stats.vip, color: 'bg-purple-50 text-purple-700' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 ${k.color}`}>
            <p className="text-xs font-medium opacity-80">{k.label}</p>
            <p className="text-2xl font-bold mt-1">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
            placeholder="Tìm theo tên, SĐT, email, địa chỉ, ghi chú, nhãn, mã đơn, nick MXH..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="all">Tất cả nguồn</option>
            {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
            <option value="all">Tất cả hạng VIP</option>
            <option value="New">New</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Khách hàng</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Liên hệ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Nguồn</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Điểm</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Hạng</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Chi tiêu</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Mua gần nhất</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Trạng thái</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">Đang tải...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">Chưa có khách hàng nào</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    {c.contactAccount && (
                      <p className="text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1 mt-0.5">
                        <Instagram size={10} /> {c.contactAccount}
                      </p>
                    )}
                    {c.address && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-xs" title={c.address}>
                        <MapPin size={10} className="shrink-0 text-slate-400" /> {c.address}
                      </p>
                    )}
                    {c.tags && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Tag size={10} /> {c.tags}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone ? (
                      <p className="flex items-center gap-1 text-slate-700 font-medium"><Phone size={12} className="text-slate-400" /> {c.phone}</p>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-normal">Chưa có SĐT</span>
                    )}
                    {c.email && <p className="flex items-center gap-1 text-slate-500 text-xs mt-0.5"><Mail size={12} className="text-slate-400" /> {c.email}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-medium">{c.source || 'Khác'}</span>
                  </td>
                  <td
                    className="px-4 py-3 font-bold text-indigo-600 cursor-pointer hover:underline"
                    onClick={() => openLoyalty(c)}
                    title="Bấm để xem lịch sử tích điểm / đổi điểm"
                  >
                    ⭐ {c.loyaltyPoints}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    onClick={() => openLoyalty(c)}
                    title="Bấm để xem hạng & ưu đãi"
                  >
                    <TierBadge tier={c.loyaltyTier} />
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{fmt(c.totalSpent)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{c.lastPurchaseDate || '—'}</td>
                  <td className="px-4 py-3">
                    <select className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none focus:border-indigo-500" value={c.status} onChange={e => handleStatusChange(c.id, e.target.value)}>
                      {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                        title="Chỉnh sửa thông tin khách hàng"
                      >
                        <Pencil size={12} className="text-indigo-600" /> Sửa
                      </button>
                      <a
                        href={`/orders?customerId=${encodeURIComponent(c.id)}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition-colors"
                        title="Tạo đơn hàng mới cho khách này"
                      >
                        <ShoppingCart size={12} /> Tạo đơn
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Add Customer Modal ===== */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" /> Thêm khách hàng mới
              </h2>
              <button aria-label="Đóng" onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên khách hàng *</label>
                <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: Vi Nguyễn" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: 0901234567" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: vinguyen@gmail.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
              </div>

              {/* Source & Specific Instagram Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn khách</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tài khoản Instagram / MXH</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: @maydo.hn, @vinguyen" value={form.contactAccount} onChange={e => setForm({...form, contactAccount: e.target.value})} />
                </div>
              </div>

              {/* Instagram Quick Pick */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">Gợi ý acc Insta:</span>
                {instagramPresets.map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setForm({ ...form, source: 'Instagram', contactAccount: acc })}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${form.contactAccount === acc ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ giao hàng</label>
                <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: 120 Phổ Quang, P.9, Q.Phú Nhuận, TP.HCM" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              </div>

              {/* Loyalty & Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng thành viên</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={form.loyaltyTier} onChange={e => setForm({...form, loyaltyTier: e.target.value})}>
                    {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tích lũy</label>
                  <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" value={form.loyaltyPoints} onChange={e => setForm({...form, loyaltyPoints: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày mua gần nhất</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" value={form.lastPurchaseDate} onChange={e => setForm({...form, lastPurchaseDate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhãn / Tags</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: VIP, Đã may 3 lần" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú tư vấn</label>
                <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" rows={2} placeholder="Ghi chú sở thích, số đo, lưu ý đặc biệt..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Hủy</button>
              <button onClick={handleAdd} disabled={addSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {addSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {addSaving ? 'Đang thêm...' : 'Thêm khách hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Customer Modal ===== */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pencil size={18} className="text-indigo-600" /> Chỉnh sửa thông tin khách hàng
              </h2>
              <button aria-label="Đóng" onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên khách hàng *</label>
                <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: Vi Nguyễn" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: 0901234567" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: vinguyen@gmail.com" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
              </div>

              {/* Source & Specific Instagram Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nguồn khách</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})}>
                    {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tài khoản Instagram / MXH</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: @maydo.hn, @vinguyen" value={editForm.contactAccount} onChange={e => setEditForm({...editForm, contactAccount: e.target.value})} />
                </div>
              </div>

              {/* Instagram Quick Pick */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">Gợi ý acc Insta:</span>
                {instagramPresets.map(acc => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, source: 'Instagram', contactAccount: acc })}
                    className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${editForm.contactAccount === acc ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ giao hàng</label>
                <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: 120 Phổ Quang, P.9, Q.Phú Nhuận, TP.HCM" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
              </div>

              {/* Loyalty & Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hạng thành viên</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={editForm.loyaltyTier} onChange={e => setEditForm({...editForm, loyaltyTier: e.target.value})}>
                    {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Điểm tích lũy</label>
                  <input type="number" min="0" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" value={editForm.loyaltyPoints} onChange={e => setEditForm({...editForm, loyaltyPoints: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày mua gần nhất</label>
                  <input type="date" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" value={editForm.lastPurchaseDate} onChange={e => setEditForm({...editForm, lastPurchaseDate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white outline-none focus:border-indigo-500" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nhãn / Tags</label>
                  <input className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" placeholder="VD: VIP, Khách quen" value={editForm.tags} onChange={e => setEditForm({...editForm, tags: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú tư vấn</label>
                <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-indigo-500" rows={2} placeholder="Ghi chú sở thích, số đo, lưu ý đặc biệt..." value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Hủy</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
                {editSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Customer Import Modal ===== */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-green-600" /> Import danh sách khách hàng
              </h2>
              <button aria-label="Đóng" onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 mb-4">
              <button
                onClick={() => { setImportMode('google'); setImportError(null); setImportResult(null); setSheetPreview(null); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 ${importMode === 'google' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600'}`}
              >
                <Link2 size={15} /> Link Google Sheet
              </button>
              <button
                onClick={() => { setImportMode('file'); setImportError(null); setImportResult(null); setSheetPreview(null); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-center gap-2 ${importMode === 'file' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-600'}`}
              >
                <FileSpreadsheet size={15} /> File Excel / CSV
              </button>
            </div>

            <div className="space-y-4">
              {importMode === 'google' ? (
                <div>
                  <label htmlFor="google-sheet-url" className="text-sm font-medium text-slate-700 mb-1.5 block">Link Google Sheet công khai</label>
                  <input
                    id="google-sheet-url"
                    type="url"
                    className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-indigo-500"
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                    value={googleSheetUrl}
                    onChange={e => { setGoogleSheetUrl(e.target.value); setGoogleSheetNames([]); setGoogleSheetName(''); setSheetPreview(null); setImportResult(null); setImportError(null); }}
                  />
                  <p className="text-xs text-slate-500 mt-1.5">Sheet chỉ cần quyền “Anyone with the link – Viewer”. Không cần cấp quyền chỉnh sửa.</p>
                  <button
                    type="button"
                    onClick={loadGoogleSheetNames}
                    disabled={sheetListLoading || !googleSheetUrl.trim()}
                    className="mt-3 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sheetListLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    {sheetListLoading ? 'Đang tải danh sách...' : 'Tải danh sách Sheet/Tab'}
                  </button>
                  {googleSheetNames.length > 0 && (
                    <div className="mt-3">
                      <label htmlFor="crm-google-sheet-name" className="text-sm font-medium text-slate-700 mb-1.5 block">Chọn Sheet/Tab khách hàng *</label>
                      <select
                        id="crm-google-sheet-name"
                        className="w-full px-3 py-2.5 rounded-lg border text-sm bg-white outline-none focus:border-indigo-500"
                        value={googleSheetName}
                        onChange={e => { setGoogleSheetName(e.target.value); setSheetPreview(null); setImportResult(null); }}
                      >
                        <option value="">-- Chọn đúng tab dữ liệu CRM --</option>
                        {googleSheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="customer-import-file" className="text-sm font-medium text-slate-700 mb-1.5 block">Chọn file Excel (.xlsx, .xls) hoặc CSV</label>
                    <input
                      id="customer-import-file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={e => { setImportFile(e.target.files?.[0] || null); setImportError(null); setImportResult(null); setSheetPreview(null); }}
                      className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 cursor-pointer"
                    />
                    {importFile && <p className="text-xs text-slate-500 mt-1">Đã chọn: <strong>{importFile.name}</strong> ({(importFile.size / 1024).toFixed(1)} KB)</p>}
                  </div>
                  <div>
                    <label htmlFor="excel-sheet-name" className="text-sm font-medium text-slate-700 mb-1 block">Tên Sheet/Tab <span className="text-slate-400 font-normal">(để trống = tự động chọn)</span></label>
                    <input id="excel-sheet-name" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="QUẢN LÍ KHÁCH HÀNG" value={importSheet} onChange={e => { setImportSheet(e.target.value); setSheetPreview(null); setImportResult(null); }} />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="customer-import-start-row" className="text-sm font-medium text-slate-700 mb-1 block">Dữ liệu bắt đầu từ hàng</label>
                <input id="customer-import-start-row" type="number" min="1" className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-indigo-500" placeholder="2" value={importStartRow} onChange={e => { setImportStartRow(e.target.value); setSheetPreview(null); }} />
              </div>

              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{importError}</p>
                </div>
              )}

              {sheetPreview && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Kết quả kiểm tra trước khi import</p>
                    <p className="text-xs text-blue-700 mt-0.5">Tìm thấy {sheetPreview.validCustomers} khách hợp lệ từ {sheetPreview.totalRows} dòng dữ liệu.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Khách mới</p><p className="text-lg font-bold text-emerald-600">{sheetPreview.newCustomers}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng CRM</p><p className="text-lg font-bold text-amber-600">{sheetPreview.duplicateCustomers}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Trùng trong Sheet</p><p className="text-lg font-bold text-amber-600">{sheetPreview.repeatedInSheet}</p></div>
                    <div className="rounded-lg bg-white p-2.5"><p className="text-xs text-slate-500">Không hợp lệ</p><p className="text-lg font-bold text-red-600">{sheetPreview.invalidRows}</p></div>
                  </div>
                  {sheetPreview.duplicateSample.length > 0 && (
                    <div className="text-xs text-amber-800">
                      <p className="font-medium mb-1">Khách sẽ được cập nhật theo SĐT:</p>
                      {sheetPreview.duplicateSample.map(item => <p key={`${item.rowNumber}-${item.phone}`}>Hàng {item.rowNumber}: {item.name} · {item.phone}</p>)}
                    </div>
                  )}
                  {sheetPreview.invalidSample.length > 0 && (
                    <div className="text-xs text-red-700">
                      <p className="font-medium mb-1">Dòng sẽ bị bỏ qua:</p>
                      {sheetPreview.invalidSample.map(item => <p key={item.rowNumber}>Hàng {item.rowNumber}: {item.reason}</p>)}
                    </div>
                  )}
                </div>
              )}

              {importResult && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-1">
                  <p className="text-sm font-semibold text-green-900">{importResult.message}</p>
                  <p className="text-xs text-green-700">Đã cập nhật vào cơ sở dữ liệu CRM thành công.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5 border-t border-slate-100 pt-3">
              <button onClick={() => setShowImport(false)} className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">Đóng</button>
              {importMode === 'google' ? (
                sheetPreview ? (
                  <button onClick={() => handleGoogleSheet('import')} disabled={importLoading || sheetPreview.validCustomers === 0} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium">
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                    {importLoading ? 'Đang import...' : `Xác nhận import ${sheetPreview.validCustomers} khách`}
                  </button>
                ) : (
                  <button onClick={() => handleGoogleSheet('preview')} disabled={importLoading || !googleSheetUrl.trim() || !googleSheetName} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium">
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    {importLoading ? 'Đang kiểm tra...' : 'Kiểm tra trùng'}
                  </button>
                )
              ) : (
                sheetPreview ? (
                  <button onClick={() => handleImportFile('import')} disabled={importLoading || sheetPreview.validCustomers === 0} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium">
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                    {importLoading ? 'Đang import...' : `Xác nhận import ${sheetPreview.validCustomers} khách`}
                  </button>
                ) : (
                  <button onClick={() => handleImportFile('preview')} disabled={importLoading || !importFile} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 font-medium">
                    {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    {importLoading ? 'Đang kiểm tra...' : 'Kiểm tra trùng'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Loyalty Detail Modal ===== */}
      {showLoyalty && selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLoyalty(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Star size={20} className="text-amber-500" /> Tích điểm &amp; Hạng — {selectedCustomer.name}
              </h2>
              <button aria-label="Đóng" onClick={() => setShowLoyalty(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {/* Loyalty Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl p-3 bg-indigo-50">
                <p className="text-xs text-indigo-600 font-medium">Tổng điểm</p>
                <p className="text-2xl font-bold text-indigo-700">{selectedCustomer.loyaltyPoints}</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-50">
                <p className="text-xs text-amber-600 font-medium">Hạng</p>
                <div className="mt-1"><TierBadge tier={selectedCustomer.loyaltyTier} /></div>
              </div>
              <div className="rounded-xl p-3 bg-emerald-50">
                <p className="text-xs text-emerald-600 font-medium">Tổng chi tiêu</p>
                <p className="text-lg font-bold text-emerald-700">{fmt(selectedCustomer.totalSpent)}</p>
              </div>
              <div className="rounded-xl p-3 bg-slate-50">
                <p className="text-xs text-slate-600 font-medium">Tổng đơn</p>
                <p className="text-2xl font-bold text-slate-700">{selectedCustomer.totalOrders}</p>
              </div>
            </div>

            {/* Customer Details */}
            {(selectedCustomer.address || selectedCustomer.contactAccount || selectedCustomer.email || selectedCustomer.notes) && (
              <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-1.5 text-sm border border-slate-100">
                {selectedCustomer.contactAccount && <p><span className="font-medium text-slate-700">Tài khoản MXH:</span> <span className="text-purple-700 font-semibold">{selectedCustomer.contactAccount}</span></p>}
                {selectedCustomer.address && <p><span className="font-medium text-slate-700">Địa chỉ:</span> {selectedCustomer.address}</p>}
                {selectedCustomer.email && <p><span className="font-medium text-slate-700">Email:</span> {selectedCustomer.email}</p>}
                {selectedCustomer.notes && <p><span className="font-medium text-slate-700">Ghi chú:</span> {selectedCustomer.notes}</p>}
              </div>
            )}

            {/* Earn Points */}
            <div className="bg-indigo-50 rounded-xl p-4 mb-5 border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-1.5">
                <Plus size={14} /> Cộng điểm cho đơn hàng
              </h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white outline-none focus:border-indigo-500" placeholder="Giá trị đơn hàng (VNĐ)" value={earnValue} onChange={e => setEarnValue(e.target.value)} />
                <input className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 text-sm bg-white outline-none focus:border-indigo-500" placeholder="Mã đơn hàng (tuỳ chọn)" value={earnOrderId} onChange={e => setEarnOrderId(e.target.value)} />
                <button onClick={handleEarn} disabled={earnLoading || !earnValue} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap font-medium">
                  {earnLoading ? <Loader2 size={14} className="animate-spin" /> : <Star size={14} />}
                  Cộng điểm
                </button>
              </div>
              <p className="text-xs text-indigo-600 mt-2">Quy đổi: 10.000đ = 1 điểm tích lũy</p>
            </div>

            {/* Redeem Points */}
            <div className="bg-purple-50 rounded-xl p-4 mb-5 border border-purple-100">
              <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-1.5">
                <Gift size={14} /> Đổi điểm giảm giá
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { pts: 100, discount: '50.000đ' },
                  { pts: 200, discount: '120.000đ' },
                  { pts: 500, discount: '350.000đ' },
                ].map(opt => (
                  <button key={opt.pts} onClick={() => handleRedeem(opt.pts)} disabled={redeemLoading || selectedCustomer.loyaltyPoints < opt.pts}
                    className="px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-white hover:bg-purple-100 text-purple-700 border-purple-200">
                    {opt.pts} điểm → Giảm {opt.discount}
                  </button>
                ))}
              </div>
            </div>

            {/* Loyalty History */}
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
                <History size={14} /> Lịch sử tích / đổi điểm
              </h3>
              {loyaltyLoading ? (
                <p className="text-sm text-slate-400 py-4 text-center">Đang tải lịch sử...</p>
              ) : loyaltyHistory.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">Chưa có lịch sử tích điểm</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loyaltyHistory.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 text-sm border border-slate-100">
                      <div>
                        <p className="font-medium text-slate-800">{tx.description || tx.type}</p>
                        <p className="text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                      <span className={`font-bold ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} điểm
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tier Progress */}
            <div className="mt-5 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl p-4 border border-indigo-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Hạng thành viên tiếp theo</h3>
              {selectedCustomer.loyaltyTier === 'VIP' ? (
                <p className="text-sm text-purple-600 font-semibold">🎉 Khách hàng đã đạt hạng VIP cao nhất!</p>
              ) : (
                <div className="text-sm text-slate-600">
                  {selectedCustomer.loyaltyTier === 'New' && <p>Cần thêm {Math.max(0, 100 - selectedCustomer.loyaltyPoints)} điểm để lên <TierBadge tier="Silver" /></p>}
                  {selectedCustomer.loyaltyTier === 'Silver' && <p>Cần thêm {Math.max(0, 300 - selectedCustomer.loyaltyPoints)} điểm để lên <TierBadge tier="Gold" /></p>}
                  {selectedCustomer.loyaltyTier === 'Gold' && <p>Cần thêm {Math.max(0, 700 - selectedCustomer.loyaltyPoints)} điểm để lên <TierBadge tier="VIP" /></p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
