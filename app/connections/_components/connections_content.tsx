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

const platforms: { key: string; icon: string; color: string; desc: string; syncDesc: string; syncVia: SyncVia; hasAdAccountId?: boolean; isOAuth?: boolean }[] = [
  { key: 'Facebook Page', icon: '📘', color: 'bg-blue-50 border-blue-200', desc: 'Quản lý trang Facebook, tin nhắn, bình luận', syncDesc: 'Inbox + Khách hàng', syncVia: 'meta', isOAuth: true },
  { key: 'Facebook Ads', icon: '💰', color: 'bg-blue-50 border-blue-200', desc: 'Quảng cáo Facebook, chi phí, leads', syncDesc: 'Campaign + Spend + Leads', syncVia: 'meta', hasAdAccountId: true, isOAuth: true },
  { key: 'Instagram', icon: '📷', color: 'bg-pink-50 border-pink-200', desc: 'Quản lý Instagram, thống kê bài đăng', syncDesc: 'Content Tracking', syncVia: 'instagram', isOAuth: true },
  { key: 'TikTok', icon: '🎵', color: 'bg-gray-50 border-gray-200', desc: 'Kênh TikTok, video analytics', syncDesc: 'Content Tracking', syncVia: 'unsupported' },
  { key: 'Zalo', icon: '💬', color: 'bg-blue-50 border-blue-200', desc: 'Zalo OA, tin nhắn tự động', syncDesc: 'InboxKpi + Khách hàng', syncVia: 'unsupported', isOAuth: true },
  { key: 'ManyChat', icon: '🤖', color: 'bg-purple-50 border-purple-200', desc: 'Chatbot tự động, flow automation', syncDesc: 'InboxKpi', syncVia: 'manychat' },
  { key: 'Google Sheets', icon: '📊', color: 'bg-green-50 border-green-200', desc: 'Đồng bộ dữ liệu 2 chiều với Sheet', syncDesc: 'KPI Dashboard', syncVia: 'unsupported' },
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
  const [apiIsAdmin, setApiIsAdmin] = useState(false);

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

  useEffect(() => { fetchData(); }, [fetchData]);

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

              {p.isOAuth ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-xs text-indigo-700 flex items-center gap-1.5">
                    <Plug size={14} className="text-indigo-500" />
                    Được ủy quyền tự động qua OAuth. Quản lý trong <a href="/settings" className="font-semibold underline ml-1">Cài Đặt</a>.
                  </p>
                </div>
              ) : (
                <>
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
                </>
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
        <h3 className="font-semibold text-slate-900 mb-3">Hướng dẫn kết nối</h3>
        <div className="text-sm text-slate-600 space-y-2">
          <p>• <strong>Bước 1:</strong> Nhập API Token thật của nền tảng và nhấn <strong>"Kiểm tra"</strong>. Hệ thống sẽ gọi API thật để xác minh token.</p>
          <p>• <strong>Bước 2:</strong> Sau khi kiểm tra thành công (badge xanh "Đã kết nối"), nhấn <strong>"Đồng bộ dữ liệu"</strong> để lấy dữ liệu thật và lưu vào database.</p>
          <p>• <strong>Bước 3:</strong> Dữ liệu thật được lưu vào database → hiển thị trên Dashboard & Marketing.</p>
          <p>• <strong>Quan trọng:</strong> Trạng thái "Đã kết nối" <em>chỉ</em> hiển thị khi API test thật thành công. Token lưu mà chưa xác minh sẽ hiện badge vàng "Chưa xác minh".</p>
          <p>• <strong>Facebook Ads:</strong> Cần token + Ad Account ID hợp lệ (quyền <code>ads_read</code>). Dữ liệu từ <code>actions</code> và <code>action_values</code> được map thành Leads, Purchases, Revenue.</p>
          <p>• <strong>Instagram:</strong> Token cần quyền <code>instagram_basic</code> + <code>pages_show_list</code>.</p>
          <p>• <strong>Telegram:</strong> Bot Token từ @BotFather → hệ thống gọi <code>getMe</code> để xác minh.</p>
          <p>• <strong>ManyChat:</strong> API Key từ Settings → API → hệ thống gọi <code>getInfo</code> để xác minh.</p>
          <p>• <strong>TikTok, Zalo, Google Sheets:</strong> Hỗ trợ lưu token, <em>chưa hỗ trợ đồng bộ tự động</em>.</p>
        </div>
      </div>
    </div>
  );
}
