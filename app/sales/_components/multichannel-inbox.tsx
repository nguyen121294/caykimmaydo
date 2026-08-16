'use client';

import Link from 'next/link';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Loader2,
  MessageSquare,
  PackagePlus,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  SalesInboxConversation,
  SalesInboxPlatform,
  SalesInboxPlatformStatus,
  SalesInboxResponse,
} from '@/lib/sales-inbox-types';
import { formatMoney } from '@/lib/utils';

type PlatformFilter = 'all' | SalesInboxPlatform;

interface QuickOrderForm {
  customerName: string;
  phone: string;
  product: string;
  productType: string;
  quantity: string;
  total: string;
  deposit: string;
  deliveryDate: string;
  note: string;
}

const emptyOrder: QuickOrderForm = {
  customerName: '',
  phone: '',
  product: '',
  productType: 'Áo dài',
  quantity: '1',
  total: '',
  deposit: '',
  deliveryDate: '',
  note: '',
};

const productTypes = ['Áo dài', 'Vest', 'Đầm', 'Sơ mi', 'Quần', 'Khác'];

const platformStyles: Record<SalesInboxPlatform, { short: string; bg: string; text: string }> = {
  facebook: { short: 'f', bg: 'bg-blue-600', text: 'text-white' },
  instagram: { short: 'IG', bg: 'bg-rose-500', text: 'text-white' },
  zalo: { short: 'Z', bg: 'bg-sky-500', text: 'text-white' },
  tiktok: { short: 'TT', bg: 'bg-slate-900', text: 'text-white' },
  manychat: { short: 'MC', bg: 'bg-indigo-500', text: 'text-white' },
  telegram: { short: 'TG', bg: 'bg-cyan-600', text: 'text-white' },
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'KH';
}

function formatConversationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '';
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat('vi-VN', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit' }).format(date);
}

function PlatformMark({ platform, size = 'md' }: { platform: SalesInboxPlatform; size?: 'sm' | 'md' }) {
  const style = platformStyles[platform];
  return (
    <span
      aria-label={platform}
      className={`${size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-9 w-9 text-xs'} ${style.bg} ${style.text} inline-flex flex-none items-center justify-center rounded-lg font-bold`}
    >
      {style.short}
    </span>
  );
}

function StatusIcon({ state }: { state: SalesInboxPlatformStatus['state'] }) {
  if (state === 'connected') return <CheckCircle2 size={14} className="text-emerald-600" />;
  if (state === 'error') return <AlertCircle size={14} className="text-red-600" />;
  if (state === 'limited') return <AlertCircle size={14} className="text-amber-600" />;
  return <WifiOff size={14} className="text-slate-400" />;
}

function InboxSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(230px,0.8fr)_minmax(360px,1.35fr)_minmax(300px,0.9fr)]">
      {[0, 1, 2].map((column) => (
        <div key={column} className="h-[520px] animate-pulse rounded-xl border border-slate-200 bg-white p-4">
          <div className="h-5 w-32 rounded bg-slate-200" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((row) => <div key={row} className="h-16 rounded-lg bg-slate-100" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MultichannelInbox() {
  const [data, setData] = useState<SalesInboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [selectedId, setSelectedId] = useState('');
  const [createdOrders, setCreatedOrders] = useState<Record<string, string>>({});

  const fetchInbox = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sales/inbox', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Không thể tải hộp thư');
      const nextData = payload as SalesInboxResponse;
      setData(nextData);
      setSelectedId((current) => {
        const stillExists = nextData.conversations.some((conversation) => conversation.id === current);
        return stillExists ? current : nextData.conversations[0]?.id || '';
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải hộp thư đa nền tảng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    return (data?.conversations || []).filter((conversation) => {
      const matchesPlatform = platformFilter === 'all' || conversation.platform === platformFilter;
      const matchesQuery = !normalizedQuery
        || conversation.customer.name.toLocaleLowerCase('vi').includes(normalizedQuery)
        || conversation.customer.phone.includes(normalizedQuery)
        || conversation.lastMessage.toLocaleLowerCase('vi').includes(normalizedQuery);
      return matchesPlatform && matchesQuery;
    });
  }, [data?.conversations, platformFilter, query]);

  useEffect(() => {
    if (filteredConversations.some((conversation) => conversation.id === selectedId)) return;
    setSelectedId(filteredConversations[0]?.id || '');
  }, [filteredConversations, selectedId]);

  const selectedConversation = (data?.conversations || []).find((conversation) => conversation.id === selectedId) || null;
  const activePlatformStatus = platformFilter === 'all'
    ? null
    : data?.platforms.find((platform) => platform.platform === platformFilter) || null;

  return (
    <section className="space-y-4" aria-labelledby="multichannel-inbox-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="multichannel-inbox-title" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <MessageSquare size={22} className="text-indigo-600" /> Tin nhắn đa nền tảng
          </h2>
          <p className="mt-1 text-sm text-slate-500">Tin nhắn được lưu lâu dài, cập nhật hằng ngày và không xóa lịch sử cũ.</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.fetchedAt && (
            <span className="text-xs text-slate-500">Cập nhật {formatConversationTime(data.fetchedAt)}</span>
          )}
          <button
            type="button"
            onClick={fetchInbox}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Trạng thái nền tảng">
        {(data?.platforms || []).map((status) => (
          <button
            key={status.platform}
            type="button"
            onClick={() => setPlatformFilter(status.platform)}
            className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 text-left transition active:scale-[0.98] ${platformFilter === status.platform ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            title={status.detail}
          >
            <PlatformMark platform={status.platform} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-slate-800">{status.label}</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <StatusIcon state={status.state} /> {status.conversationCount} hội thoại
              </span>
            </span>
          </button>
        ))}
      </div>

      {loading && !data ? (
        <InboxSkeleton />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto text-red-600" size={24} />
          <p className="mt-2 font-semibold text-red-900">Không tải được hộp thư</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button type="button" onClick={fetchInbox} className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">
            Thử lại
          </button>
        </div>
      ) : (
        <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[minmax(230px,0.8fr)_minmax(360px,1.35fr)_minmax(300px,0.9fr)]">
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-slate-200 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <label htmlFor="conversation-search" className="sr-only">Tìm hội thoại</label>
                <input
                  id="conversation-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-h-10 pl-9"
                  placeholder="Tìm tên, SĐT, nội dung"
                />
              </div>
              <button
                type="button"
                onClick={() => setPlatformFilter('all')}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${platformFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
              >
                Tất cả nền tảng ({data?.conversations.length || 0})
              </button>
            </div>

            <div className="max-h-[590px] overflow-y-auto" aria-label="Danh sách hội thoại">
              {filteredConversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  hasOrder={Boolean(createdOrders[conversation.id])}
                  onSelect={() => setSelectedId(conversation.id)}
                />
              ))}
              {filteredConversations.length === 0 && (
                <div className="p-6 text-center">
                  <Inbox className="mx-auto text-slate-300" size={28} />
                  <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có hội thoại</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {activePlatformStatus?.detail || 'Không tìm thấy hội thoại phù hợp với bộ lọc.'}
                  </p>
                  {activePlatformStatus && activePlatformStatus.state !== 'connected' && (
                    <Link href="/connections" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800">
                      Kiểm tra kết nối <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <ConversationViewer conversation={selectedConversation} />

          <QuickOrder
            conversation={selectedConversation}
            createdOrderId={selectedConversation ? createdOrders[selectedConversation.id] : ''}
            onCreated={(conversationId, orderId) => {
              setCreatedOrders((current) => ({ ...current, [conversationId]: orderId }));
            }}
          />
        </div>
      )}

      <p className="text-xs text-slate-500">
        Việc đồng bộ dữ liệu vẫn được quản lý tại{' '}
        <Link href="/sync-hub" className="font-semibold text-indigo-700 hover:text-indigo-800">Trung tâm đồng bộ</Link>.
      </p>
    </section>
  );
}

function ConversationRow({
  conversation,
  selected,
  hasOrder,
  onSelect,
}: {
  conversation: SalesInboxConversation;
  selected: boolean;
  hasOrder: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full gap-3 border-b border-slate-100 p-3 text-left transition last:border-b-0 ${selected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
    >
      <span className="relative flex-none">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {initials(conversation.customer.name)}
        </span>
        <span className="absolute -bottom-1 -right-1"><PlatformMark platform={conversation.platform} size="sm" /></span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{conversation.customer.name}</span>
          <span className="flex-none text-[11px] text-slate-400">{formatConversationTime(conversation.updatedAt)}</span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{conversation.lastMessage}</span>
        {hasOrder && <span className="mt-1 inline-block text-[11px] font-semibold text-emerald-700">Đã tạo đơn</span>}
      </span>
    </button>
  );
}

function ConversationViewer({ conversation }: { conversation: SalesInboxConversation | null }) {
  if (!conversation) {
    return (
      <div className="flex min-h-[420px] items-center justify-center border-b border-slate-200 p-8 text-center lg:border-b-0 lg:border-r">
        <div>
          <MessageSquare className="mx-auto text-slate-300" size={32} />
          <p className="mt-3 font-semibold text-slate-700">Chọn một hội thoại để đọc</p>
          <p className="mt-1 text-sm text-slate-500">Tin nhắn thật từ tài khoản đã kết nối sẽ hiển thị tại đây.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[520px] flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
          {initials(conversation.customer.name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-900">{conversation.customer.name}</p>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <PlatformMark platform={conversation.platform} size="sm" /> Hội thoại {conversation.externalId.slice(-8)}
          </p>
        </div>
      </div>
      <div className="flex max-h-[520px] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
        {conversation.messages.length === 0 ? (
          <div className="m-auto text-center text-sm text-slate-500">Hội thoại chưa có nội dung văn bản.</div>
        ) : conversation.messages.map((message) => (
          <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[84%] rounded-xl px-3 py-2 ${message.direction === 'outbound' ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-800'}`}>
              <p className={`mb-1 text-[11px] font-semibold ${message.direction === 'outbound' ? 'text-indigo-100' : 'text-slate-500'}`}>{message.senderName}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
              <p className={`mt-1 text-right text-[10px] ${message.direction === 'outbound' ? 'text-indigo-100' : 'text-slate-400'}`}>
                {formatConversationTime(message.sentAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickOrder({
  conversation,
  createdOrderId,
  onCreated,
}: {
  conversation: SalesInboxConversation | null;
  createdOrderId: string;
  onCreated: (conversationId: string, orderId: string) => void;
}) {
  const [form, setForm] = useState<QuickOrderForm>(emptyOrder);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      ...emptyOrder,
      customerName: conversation?.customer.name || '',
      phone: conversation?.customer.phone || '',
    });
  }, [conversation?.id, conversation?.customer.name, conversation?.customer.phone]);

  const update = (field: keyof QuickOrderForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const remaining = Math.max(0, Number(form.total || 0) - Number(form.deposit || 0));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!conversation) return;
    if (!form.customerName.trim() || !form.product.trim() || !form.deliveryDate) {
      toast.error('Vui lòng nhập tên khách, sản phẩm và ngày giao.');
      return;
    }
    if (Number(form.deposit || 0) > Number(form.total || 0)) {
      toast.error('Tiền cọc không được lớn hơn tổng giá trị.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity || 1),
          total: Number(form.total || 0),
          deposit: Number(form.deposit || 0),
          source: conversation.platform,
          department: 'Tư vấn / Sale',
          status: 'Mới nhận',
          notes: [
            form.note.trim(),
            `Nguồn hội thoại: ${conversation.platform} (${conversation.externalId})`,
          ].filter(Boolean).join('\n'),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Không thể tạo đơn hàng');
      onCreated(conversation.id, payload?.order?.orderId || 'Đã tạo');
      toast.success(`Đã tạo đơn ${payload?.order?.orderId || ''}`.trim());
      setForm((current) => ({
        ...current,
        product: '',
        total: '',
        deposit: '',
        note: '',
      }));
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Không thể tạo đơn hàng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="bg-white p-4" aria-label="Tạo đơn nhanh">
      <div className="flex items-center gap-2">
        <PackagePlus size={18} className="text-indigo-600" />
        <h3 className="font-bold text-slate-900">Tạo đơn nhanh</h3>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">Thông tin khách được lấy từ hội thoại đang chọn.</p>

      {!conversation ? (
        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">Chọn hội thoại trước khi tạo đơn.</div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          {createdOrderId && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
              <CheckCircle2 size={15} /> Đã tạo đơn {createdOrderId}
            </div>
          )}
          <OrderField label="Tên khách hàng" required>
            <input value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />
          </OrderField>
          <OrderField label="Số điện thoại">
            <input inputMode="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          </OrderField>
          <OrderField label="Sản phẩm" required>
            <input value={form.product} onChange={(event) => update('product', event.target.value)} placeholder="Ví dụ: Áo dài lụa" />
          </OrderField>
          <div className="grid grid-cols-2 gap-3">
            <OrderField label="Loại sản phẩm">
              <select value={form.productType} onChange={(event) => update('productType', event.target.value)}>
                {productTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </OrderField>
            <OrderField label="Số lượng">
              <input type="number" min="1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} />
            </OrderField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <OrderField label="Tổng giá trị">
              <input type="number" min="0" value={form.total} onChange={(event) => update('total', event.target.value)} />
            </OrderField>
            <OrderField label="Tiền cọc">
              <input type="number" min="0" value={form.deposit} onChange={(event) => update('deposit', event.target.value)} />
            </OrderField>
          </div>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">Còn lại: <strong className="text-slate-900">{formatMoney(remaining)}</strong></p>
          <OrderField label="Ngày giao" required>
            <input type="date" value={form.deliveryDate} onChange={(event) => update('deliveryDate', event.target.value)} />
          </OrderField>
          <OrderField label="Ghi chú">
            <textarea rows={2} value={form.note} onChange={(event) => update('note', event.target.value)} placeholder="Số đo, màu sắc, yêu cầu riêng" />
          </OrderField>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
            {saving ? 'Đang tạo đơn' : 'Tạo đơn hàng'}
          </button>
        </form>
      )}
    </aside>
  );
}

function OrderField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label>{label}{required ? ' *' : ''}</label>
      {children}
    </div>
  );
}
