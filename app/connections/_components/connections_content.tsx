'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plug, CheckCircle, XCircle, RefreshCw, Zap, CloudDownload, Clock, Database, AlertCircle, AlertTriangle, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface PlatformConn {
  id: string;
  platform: string;
  isConnected: boolean;
  lastTested: string | null;
  pageId?: string;
  pageName?: string;
  adAccountId?: string;
  adAccountName?: string;
  igAccountId?: string;
  tokenError?: string;
  hasToken?: boolean;
  needsVerification?: boolean;
}

interface SyncResult {
  platform: string;
  recordsFetched: number;
  recordsSaved: number;
  syncedAt: string;
  error?: string;
}

type SyncVia = 'meta' | 'telegram' | 'instagram' | 'manychat' | 'unsupported';

const platforms: { key: string; icon: string; color: string; desc: string; syncDesc: string; syncVia: SyncVia; hasAdAccountId?: boolean; hasIgAccountId?: boolean; isOAuth?: boolean }[] = [
  { key: 'Facebook Page', icon: '📘', color: 'bg-blue-50 border-blue-200', desc: 'Quản lý trang Facebook, tin nhắn, bình luận', syncDesc: 'Inbox + Khách hàng', syncVia: 'meta' },
  { key: 'Facebook Ads', icon: '💰', color: 'bg-blue-50 border-blue-200', desc: 'Quản lý Quảng cáo Facebook, chi phí, leads', syncDesc: 'Campaign + Spend + Leads', syncVia: 'meta', hasAdAccountId: true },
  { key: 'Instagram', icon: '📷', color: 'bg-pink-50 border-pink-200', desc: 'Quản lý Instagram, thống kê bài đăng', syncDesc: 'Content Tracking', syncVia: 'instagram', hasIgAccountId: true },
  { key: 'TikTok', icon: '🎵', color: 'bg-gray-50 border-gray-200', desc: 'Kênh TikTok, video analytics', syncDesc: 'Content Tracking', syncVia: 'unsupported' },
  { key: 'Zalo', icon: '💬', color: 'bg-blue-50 border-blue-200', desc: 'Zalo OA, tin nhắn tự động', syncDesc: 'InboxKpi + Khách hàng', syncVia: 'unsupported', isOAuth: true },
  { key: 'ManyChat', icon: '🤖', color: 'bg-purple-50 border-purple-200', desc: 'Chatbot tự động, flow automation', syncDesc: 'InboxKpi', syncVia: 'manychat' },
  { key: 'Telegram', icon: '✈️', color: 'bg-sky-50 border-sky-200', desc: 'Bot Telegram, thông báo tự động', syncDesc: 'Automation Logs', syncVia: 'telegram' },
];

export default function ConnectionsContent() {
  const { data: session } = useSession();
  const isAdminSession = (session?.user as any)?.role === 'admin';

  const [connections, setConnections] = useState<PlatformConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [adAccountIds, setAdAccountIds] = useState<Record<string, string>>({});
  const [igAccountIds, setIgAccountIds] = useState<Record<string, string>>({});
  const [apiIsAdmin, setApiIsAdmin] = useState(false);

  // State Meta Account Selector Modal
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [metaPages, setMetaPages] = useState<any[]>([]);
  const [metaAdAccounts, setMetaAdAccounts] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>('');
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>('');
  const [loadingMetaAccounts, setLoadingMetaAccounts] = useState(false);
  const [savingMetaChoice, setSavingMetaChoice] = useState(false);

  const isAdmin = isAdminSession || apiIsAdmin;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/connections');
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          setConnections(json);
        } else {
          setConnections(json.connections || []);
          setApiIsAdmin(!!json.isAdmin);
        }
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  const loadMetaAccounts = useCallback(async () => {
    try {
      setLoadingMetaAccounts(true);
      const res = await fetch('/api/meta/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          setMetaPages(data.pages || []);
          setMetaAdAccounts(data.adAccounts || []);
          if (data.selectedPageId) setSelectedPageId(data.selectedPageId);
          else if (data.pages?.[0]?.id) setSelectedPageId(data.pages[0].id);

          if (data.selectedAdAccountId) setSelectedAdAccountId(data.selectedAdAccountId);
          else if (data.adAccounts?.[0]?.id) setSelectedAdAccountId(data.adAccounts[0].id);
        }
      }
    } catch {
      toast.error('Lỗi khi tải danh sách tài khoản Meta');
    } finally {
      setLoadingMetaAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (typeof window !== 'undefined' && window.location.search.includes('select_meta=true')) {
      setShowMetaModal(true);
      loadMetaAccounts();
    }
  }, [fetchData, loadMetaAccounts]);

  const handleSaveMetaSelection = async () => {
    try {
      setSavingMetaChoice(true);
      const selectedPageObj = metaPages.find(p => p.id === selectedPageId);
      const selectedAdObj = metaAdAccounts.find(a => a.id === selectedAdAccountId);

      const res = await fetch('/api/meta/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedPageId,
          pageName: selectedPageObj?.name || '',
          pageAccessToken: selectedPageObj?.accessToken || '',
          adAccountId: selectedAdAccountId,
          adAccountName: selectedAdObj?.name || '',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'Cập nhật tài khoản chọn thành công!');
        setShowMetaModal(false);
        fetchData();
      } else {
        toast.error(data.error || 'Cập nhật thất bại');
      }
    } catch {
      toast.error('Lỗi kết nối server khi lưu lựa chọn');
    } finally {
      setSavingMetaChoice(false);
    }
  };

  const getConn = (platform: string) => connections.find(c => c.platform === platform);
  const isConnected = (platform: string) => getConn(platform)?.isConnected || false;
  const lastTested = (platform: string) => getConn(platform)?.lastTested;
  const getTokenError = (platform: string) => getConn(platform)?.tokenError;
  const hasStoredToken = (platform: string) => getConn(platform)?.hasToken || false;
  const needsVerification = (platform: string) => getConn(platform)?.needsVerification || false;

  const handleTest = async (platformKey: string) => {
    if (!isAdmin) {
      toast.error('Chỉ tài khoản Admin mới có quyền kiểm tra kết nối.');
      return;
    }
    const token = tokens[platformKey];
    const storedToken = hasStoredToken(platformKey);

    if (!token && !storedToken) {
      toast.error('Vui lòng nhập API Token/Key');
      return;
    }

    setTesting(platformKey);
    setSyncErrors(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
    try {
      const bodyData: Record<string, string> = {
        platform: platformKey,
        action: 'test',
      };
      if (token) bodyData.token = token;
      if (adAccountIds[platformKey]) bodyData.adAccountId = adAccountIds[platformKey];
      if (igAccountIds[platformKey]) bodyData.igAccountId = igAccountIds[platformKey];

      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        toast.success(`${platformKey}: Kết nối API thành công!`);
        setSyncErrors(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
        fetchData();
      } else {
        const errorMsg = data?.error || `${platformKey}: Token không hợp lệ`;
        toast.error(errorMsg);
        setSyncErrors(prev => ({ ...prev, [platformKey]: errorMsg }));
        fetchData();
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setTesting(null);
    }
  };

  const handleSync = async (platformKey: string) => {
    if (!isConnected(platformKey)) {
      toast.error(`${platformKey} chưa được kết nối. Vui lòng nhập token và kiểm tra kết nối trước.`);
      return;
    }

    const platformDef = platforms.find(p => p.key === platformKey);

    if (platformDef?.syncVia === 'unsupported') {
      toast.info(`${platformKey}: Đã kết nối nhưng chưa hỗ trợ đồng bộ tự động.`);
      return;
    }

    setSyncing(platformKey);
    setSyncErrors(prev => { const c = { ...prev }; delete c[platformKey]; return c; });

    try {
      const endpointMap: Record<string, string> = {
        meta: '/api/marketing/sync/meta',
        telegram: '/api/marketing/sync/telegram',
        instagram: '/api/marketing/sync/instagram',
        manychat: '/api/marketing/sync/manychat',
      };
      const endpoint = platformDef?.syncVia ? endpointMap[platformDef.syncVia] || '/api/connections/sync' : '/api/connections/sync';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || result.success === false) {
        const errorMsg = result?.error || `Lỗi đồng bộ ${platformKey}`;
        toast.error(errorMsg);
        setSyncErrors(prev => ({ ...prev, [platformKey]: errorMsg }));
      } else {
        let fetched = result.recordsFetched ?? 0;
        let saved = result.recordsSaved ?? 0;
        if (result.results && Array.isArray(result.results)) {
          const platformResult = result.results.find((r: any) => r.platform === platformKey) || result.results[0];
          if (platformResult) {
            setSyncResults(prev => ({ ...prev, [platformKey]: platformResult }));
            fetched = platformResult.recordsFetched ?? fetched;
            saved = platformResult.recordsSaved ?? saved;
          }
        }
        const platformResult = result.results?.find((r: any) => r.platform === platformKey) || {
          platform: platformKey,
          recordsFetched: fetched,
          recordsSaved: saved,
          syncedAt: new Date().toISOString(),
        };
        setSyncResults(prev => ({ ...prev, [platformKey]: platformResult }));
        toast.success(result.message || `Đồng bộ ${platformKey}: ${fetched} lấy về, ${saved} đã lưu`);
      }
      fetchData();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSyncing(null);
    }
  };

  const handleRefreshAll = async () => {
    setSyncingAll(true);
    try {
      const syncable = platforms.filter(p => isConnected(p.key) && p.syncVia !== 'unsupported');
      if (syncable.length === 0) {
        toast.info('Không có nền tảng nào đã kết nối để đồng bộ');
        return;
      }
      const metaPlatforms = syncable.filter(p => p.syncVia === 'meta');
      if (metaPlatforms.length > 0) {
        const res = await fetch('/api/marketing/sync/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'all' }),
        });
        const result = await res.json().catch(() => ({}));
        if (result.results) {
          result.results.forEach((r: any) => {
            setSyncResults(prev => ({ ...prev, [r.platform]: r }));
            if (r.error) setSyncErrors(prev => ({ ...prev, [r.platform]: r.error }));
          });
        }
      }
      for (const p of syncable) {
        if (p.syncVia !== 'meta') {
          await handleSync(p.key);
        }
      }
      toast.success('Đã hoàn tất đồng bộ dữ liệu');
      fetchData();
    } catch {
      toast.error('Lỗi khi đồng bộ dữ liệu');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDisconnect = async (platformKey: string) => {
    if (!isAdmin) {
      toast.error('Chỉ tài khoản Admin mới có quyền ngắt kết nối.');
      return;
    }
    if (!confirm(`Bạn có chắc muốn ngắt kết nối ${platformKey}?`)) return;
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, action: 'disconnect' }),
      });
      if (res.ok) {
        toast.success(`Đã ngắt kết nối ${platformKey}`);
        setTokens(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
        setSyncResults(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
        fetchData();
      }
    } catch {
      toast.error('Lỗi ngắt kết nối');
    }
  };

  const renderBadge = (p: typeof platforms[0]) => {
    const connected = isConnected(p.key);
    const error = getTokenError(p.key) || syncErrors[p.key];
    const isTestingThis = testing === p.key;
    const isSyncingThis = syncing === p.key;
    const stored = hasStoredToken(p.key);
    const unverified = needsVerification(p.key);

    if (loading) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
          <Loader2 size={12} className="animate-spin" /> Đang tải
        </span>
      );
    }
    if (isSyncingThis) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          <Loader2 size={12} className="animate-spin" /> Đang đồng bộ
        </span>
      );
    }
    if (isTestingThis) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          <Loader2 size={12} className="animate-spin" /> Đang kiểm tra
        </span>
      );
    }
    if (connected && !error) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
          <ShieldCheck size={12} /> Đã kết nối
        </span>
      );
    }
    if (error) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-full" title={error}>
          <AlertTriangle size={12} /> Token không hợp lệ
        </span>
      );
    }
    if (stored && !connected && unverified) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
          <ShieldAlert size={12} /> Chưa xác minh
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
        <XCircle size={12} /> Chưa kết nối
      </span>
    );
  };

  const connectedCount = connections.filter(c => c.isConnected).length;
  const unverifiedCount = connections.filter(c => !c.isConnected && c.hasToken && c.needsVerification).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Plug className="text-indigo-600" size={28} /> Kết Nối Nền Tảng
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý kết nối và đồng bộ dữ liệu với các nền tảng</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowMetaModal(true);
              loadMetaAccounts();
            }}
            className="px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium flex items-center gap-1.5 border border-indigo-200 transition-colors"
          >
            <Plug size={14} className="text-indigo-600" />
            Tùy Chọn Page & Quảng Cáo
          </button>
          <button onClick={handleRefreshAll} disabled={syncing !== null || syncingAll}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors">
            {syncingAll ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
            {syncingAll ? 'Đang đồng bộ...' : 'Đồng bộ tất cả'}
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-medium">Chế độ chỉ xem: Bạn cần tài khoản <strong>Admin</strong> để dán API Token, kiểm tra hoặc ngắt kết nối.</span>
          </div>
          <span className="text-xs bg-amber-200 text-amber-900 font-semibold px-2.5 py-1 rounded-full">User View</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>Lưu ý:</strong> Chỉ hỗ trợ dữ liệu từ API. Nhập token thật và nhấn <strong>"Kiểm tra"</strong> để xác minh API. Trạng thái <strong>"Đã kết nối"</strong> chỉ hiển thị khi API test thành công. Nút <strong>"Đồng bộ dữ liệu"</strong> gọi API để lấy dữ liệu.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700">
          <p className="text-xs font-medium">Tổng nền tảng</p>
          <p className="text-2xl font-bold">{platforms.length}</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <p className="text-xs font-medium">Đã kết nối</p>
          <p className="text-2xl font-bold">{connectedCount}</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
          <p className="text-xs font-medium">Chưa xác minh</p>
          <p className="text-2xl font-bold">{unverifiedCount}</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-100 text-slate-700">
          <p className="text-xs font-medium">Chưa kết nối</p>
          <p className="text-2xl font-bold">{platforms.length - connectedCount - unverifiedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {platforms.map(p => {
          const conn = getConn(p.key);
          const connected = isConnected(p.key);
          const error = getTokenError(p.key) || syncErrors[p.key];
          const isTesting = testing === p.key;
          const isSyncing = syncing === p.key;
          const lastTest = lastTested(p.key);
          const syncResult = syncResults[p.key];
          const stored = hasStoredToken(p.key);
          const unverified = needsVerification(p.key);

          return (
            <div key={p.key} className={`bg-white rounded-xl border p-5 space-y-4 shadow-sm transition-all ${connected ? 'border-emerald-200' : error ? 'border-red-200' : unverified ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl p-2 rounded-lg bg-slate-50">{p.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.key}</h3>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                    <span className="inline-block text-[11px] text-slate-400 mt-0.5">Dữ liệu: {p.syncDesc}</span>
                  </div>
                </div>
                {renderBadge(p)}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    <AlertTriangle size={14} className="text-red-500" /> {error}
                  </p>
                </div>
              )}

              {p.key === 'Facebook Page' && conn?.pageId && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 space-y-0.5">
                  <p className="font-medium text-slate-900">📘 Trang Fanpage Đã Chọn:</p>
                  <p className="font-semibold text-indigo-600">{conn.pageName || 'Tên trang chưa cập nhật'} <span className="text-slate-400 font-normal">(ID: {conn.pageId})</span></p>
                </div>
              )}

              {p.key === 'Facebook Ads' && (conn?.adAccountId || conn?.adAccountName) && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 space-y-0.5">
                  <p className="font-medium text-slate-900">💰 Tài Khoản Quảng Cáo Đã Chọn:</p>
                  <p className="font-semibold text-indigo-600">{conn.adAccountName || `act_${conn.adAccountId}`} <span className="text-slate-400 font-normal">(ID: act_{conn.adAccountId})</span></p>
                </div>
              )}

              {p.key === 'Instagram' && conn?.igAccountId && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 space-y-0.5">
                  <p className="font-medium text-slate-900">📷 Tài Khoản Instagram Business Đã Chọn:</p>
                  <p className="font-semibold text-pink-600">ID: {conn.igAccountId}</p>
                </div>
              )}

              {p.isOAuth && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-xs text-indigo-700 flex items-center gap-1.5">
                    <Plug size={14} className="text-indigo-500" />
                    Được ủy quyền tự động qua OAuth. Quản lý trong <a href="/settings" className="font-semibold underline ml-1">Cài Đặt</a>.
                  </p>
                </div>
              )}

              <input
                disabled={!isAdmin}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500"
                placeholder={stored && !tokens[p.key] ? 'Token đã lưu — nhập mới để thay thế' : `Nhập API Token / Key cho ${p.key}`}
                type="password"
                value={tokens[p.key] || ''}
                onChange={e => setTokens(prev => ({ ...prev, [p.key]: e.target.value }))}
              />

              {p.hasAdAccountId && (
                <input
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Ad Account ID (ví dụ: 123456789 hoặc act_123456789)"
                  value={adAccountIds[p.key] || ''}
                  onChange={e => setAdAccountIds(prev => ({ ...prev, [p.key]: e.target.value }))}
                />
              )}

              {p.hasIgAccountId && (
                <input
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  placeholder="Instagram Business Account ID (Ví dụ: 17841400000000000)"
                  value={igAccountIds[p.key] || ''}
                  onChange={e => setIgAccountIds(prev => ({ ...prev, [p.key]: e.target.value }))}
                />
              )}

              <div className="space-y-1">
                {lastTest && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={10} /> Kiểm tra gần nhất: {new Date(lastTest).toLocaleString('vi-VN')}
                  </p>
                )}
                {syncResult && !syncResult.error && (
                  <p className="text-xs text-indigo-600 flex items-center gap-1 font-medium">
                    <Database size={10} /> Đồng bộ: {syncResult.recordsFetched} lấy về, {syncResult.recordsSaved} đã lưu ({new Date(syncResult.syncedAt).toLocaleString('vi-VN')})
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {(p.isOAuth || p.syncVia === 'meta') && (
                  <button
                    onClick={() => {
                      setShowMetaModal(true);
                      loadMetaAccounts();
                    }}
                    className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Plug size={12} /> Tùy chọn Page/Ads
                  </button>
                )}

                {!connected && stored && unverified && !tokens[p.key] ? (
                  <button onClick={() => handleTest(p.key)} disabled={!isAdmin || isTesting || isSyncing}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                    Xác minh token đã lưu
                  </button>
                ) : (
                  <button onClick={() => handleTest(p.key)} disabled={!isAdmin || isTesting || isSyncing}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Kiểm tra
                  </button>
                )}

                {connected && p.syncVia !== 'unsupported' && (
                  <button onClick={() => handleSync(p.key)} disabled={isSyncing || isTesting}
                    className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                    {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                    Đồng bộ dữ liệu
                  </button>
                )}
                {connected && p.syncVia === 'unsupported' && (
                  <span className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm flex items-center gap-1.5 border border-amber-200">
                    <AlertCircle size={12} />
                    Đã kết nối nhưng chưa hỗ trợ đồng bộ tự động
                  </span>
                )}
                {connected && (
                  <button onClick={() => handleDisconnect(p.key)} disabled={!isAdmin}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 disabled:opacity-50 transition-colors">
                    Ngắt kết nối
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <span>💡 Hướng dẫn lấy API Token Facebook Dài Hạn (Khuyên Dùng)</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Khắc phục 100% lỗi Domain OAuth</span>
        </h3>
        <div className="text-sm text-slate-600 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p>Dùng Token thủ công giúp ứng dụng hoạt động <strong>24/7 độc lập</strong> mà không cần mở trình duyệt hay đăng nhập Facebook:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-semibold text-indigo-700 block">Bước 1: Lấy Token từ Facebook Explorer</span>
              <p>Mở công cụ <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">Graph API Explorer</a> ➔ Chọn App của bạn ➔ Bấm <em>Add a Permission</em> chọn đủ các quyền: <code>pages_read_engagement</code>, <code>pages_messaging</code>, <code>pages_manage_metadata</code>, <code>ads_read</code>, <code>read_insights</code> ➔ Bấm <strong>Generate Access Token</strong>.</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-semibold text-indigo-700 block">Bước 2: Đổi thành Token Dài Hạn (60 ngày)</span>
              <p>Mở công cụ <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-medium">Access Token Debugger</a> ➔ Dán token ở B1 vào bấm <strong>Debug</strong> ➔ Cuộn xuống bấm <strong>Extend Access Token</strong> ➔ Copy token 60 ngày dán vào khung ở trên.</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">Lưu ý: Ô Ad Account ID bạn có thể nhập <code>1052674760608736</code> hoặc <code>act_1052674760608736</code>, hệ thống tự động nhận diện chuẩn xác.</p>
        </div>

        <h3 className="font-semibold text-slate-900 mt-6 mb-3">Quy trình kiểm tra & đồng bộ chung</h3>
        <div className="text-sm text-slate-600 space-y-2">
          <p>• <strong>Bước 1:</strong> Nhập API Token thật của nền tảng và nhấn <strong>"Kiểm tra"</strong>. Hệ thống sẽ gọi API thật để xác minh token.</p>
          <p>• <strong>Bước 2:</strong> Sau khi kiểm tra thành công (badge xanh "Đã kết nối"), nhấn <strong>"Đồng bộ dữ liệu"</strong> để lấy dữ liệu thật và lưu vào database.</p>
          <p>• <strong>Bước 3:</strong> Dữ liệu thật được lưu vào database → hiển thị trên Dashboard & Marketing.</p>
          <p>• <strong>Facebook Ads:</strong> Cần token + Ad Account ID hợp lệ (quyền <code>ads_read</code>). Dữ liệu từ <code>actions</code> và <code>action_values</code> được map thành Leads, Purchases, Revenue.</p>
          <p>• <strong>Instagram:</strong> Token cần quyền <code>instagram_basic</code> + <code>pages_show_list</code>.</p>
          <p>• <strong>Telegram:</strong> Bot Token từ @BotFather → hệ thống gọi <code>getMe</code> để xác minh.</p>
          <p>• <strong>ManyChat:</strong> API Key từ Settings → API → hệ thống gọi <code>getInfo</code> để xác minh.</p>
        </div>
      </div>

      {/* Modal Tùy chọn Meta (Facebook Page & Facebook Ads) */}
      {showMetaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  📘 Tùy Chọn Fanpage & Quảng Cáo Meta
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn cụ thể Fanpage và Tài khoản Quảng cáo Facebook bạn muốn đồng bộ.
                </p>
              </div>
              <button
                onClick={() => setShowMetaModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold px-2 py-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {loadingMetaAccounts ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Đang tải danh sách Fanpage và Ad Accounts từ Facebook...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Chọn Fanpage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    1. Trang Fanpage Facebook
                  </label>
                  {metaPages.length > 0 ? (
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedPageId}
                      onChange={e => setSelectedPageId(e.target.value)}
                    >
                      {metaPages.map(page => (
                        <option key={page.id} value={page.id}>
                          {page.name} (ID: {page.id}) {page.category ? `- ${page.category}` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Không tìm thấy Fanpage nào hoặc chưa kết nối tài khoản. Vui lòng nhấn <strong>"Kết Nối Facebook"</strong> trong Cài Đặt.
                    </p>
                  )}
                </div>

                {/* Chọn Tài khoản Quảng cáo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    2. Tài Khoản Quảng Cáo Facebook (Ad Account)
                  </label>
                  {metaAdAccounts.length > 0 ? (
                    <select
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={selectedAdAccountId}
                      onChange={e => setSelectedAdAccountId(e.target.value)}
                    >
                      {metaAdAccounts.map(acct => (
                        <option key={acct.id} value={acct.id}>
                          {acct.name} (ID: act_{acct.id}) [{acct.currency}] {acct.status === 1 ? '• Active' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      Không tìm thấy tài khoản quảng cáo nào thuộc Facebook này.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowMetaModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveMetaSelection}
                disabled={savingMetaChoice || loadingMetaAccounts}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-sm"
              >
                {savingMetaChoice ? <Loader2 size={14} className="animate-spin" /> : <Plug size={14} />}
                Lưu Lựa Chọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
