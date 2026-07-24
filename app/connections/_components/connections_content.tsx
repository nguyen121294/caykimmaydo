'use client';
import { useState, useEffect, useCallback } from 'react';
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

const platforms: { key: string; icon: string; color: string; desc: string; syncDesc: string; syncVia: SyncVia; hasAdAccountId?: boolean }[] = [
  { key: 'Facebook Page', icon: '📘', color: 'bg-blue-50 border-blue-200', desc: 'Quản lý trang Facebook, tin nhắn, bình luận', syncDesc: 'Inbox + Khách hàng', syncVia: 'meta' },
  { key: 'Facebook Ads', icon: '💰', color: 'bg-blue-50 border-blue-200', desc: 'Quảng cáo Facebook, chi phí, leads', syncDesc: 'Campaign + Spend + Leads', syncVia: 'meta', hasAdAccountId: true },
  { key: 'Instagram', icon: '📷', color: 'bg-pink-50 border-pink-200', desc: 'Quản lý Instagram, thống kê bài đăng', syncDesc: 'Content Tracking', syncVia: 'instagram' },
  { key: 'TikTok', icon: '🎵', color: 'bg-gray-50 border-gray-200', desc: 'Kênh TikTok, video analytics', syncDesc: 'Content Tracking', syncVia: 'unsupported' },
  { key: 'Zalo', icon: '💬', color: 'bg-blue-50 border-blue-200', desc: 'Zalo OA, tin nhắn tự động', syncDesc: 'InboxKpi + Khách hàng', syncVia: 'unsupported' },
  { key: 'ManyChat', icon: '🤖', color: 'bg-purple-50 border-purple-200', desc: 'Chatbot tự động, flow automation', syncDesc: 'InboxKpi', syncVia: 'manychat' },
  { key: 'Google Sheets', icon: '📊', color: 'bg-green-50 border-green-200', desc: 'Đồng bộ dữ liệu 2 chiều với Sheet', syncDesc: 'KPI Dashboard', syncVia: 'unsupported' },
  { key: 'Telegram', icon: '✈️', color: 'bg-sky-50 border-sky-200', desc: 'Bot Telegram, thông báo tự động', syncDesc: 'Automation Logs', syncVia: 'telegram' },
];

export default function ConnectionsContent() {
  const [connections, setConnections] = useState<PlatformConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [adAccountIds, setAdAccountIds] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/connections');
      if (res.ok) setConnections(await res.json());
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
    const token = tokens[platformKey];
    const storedToken = hasStoredToken(platformKey);

    // Cho phép test với token đã lưu (không cần nhập lại)
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
      // Chỉ gửi token mới nếu user nhập
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

    // Nền tảng chưa hỗ trợ đồng bộ tự động
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
      const result = await res.json();

      if (!res.ok || result?.success === false) {
        const errorMsg = result?.error || `Lỗi đồng bộ ${platformKey}`;
        toast.error(errorMsg);
        setSyncErrors(prev => ({ ...prev, [platformKey]: errorMsg }));

        if (result?.results) {
          const platformResult = result.results.find((r: any) => r.platform === platformKey) || result.results[0];
          if (platformResult) {
            setSyncResults(prev => ({ ...prev, [platformKey]: platformResult }));
          }
        }
        return;
      }

      const saved = result.recordsSaved ?? 0;
      const fetched = result.recordsFetched ?? 0;

      const platformResult = result.results?.find((r: any) => r.platform === platformKey) || {
        platform: platformKey,
        recordsFetched: fetched,
        recordsSaved: saved,
        syncedAt: result.syncedAt || new Date().toISOString(),
      };
      setSyncResults(prev => ({ ...prev, [platformKey]: platformResult }));

      if (saved === 0 && fetched === 0) {
        toast.info(result.message || 'Đã kết nối nhưng chưa có dữ liệu mới');
      } else {
        toast.success(result.message || `Đồng bộ ${platformKey}: ${fetched} lấy về, ${saved} đã lưu`);
      }

      if (result.errors?.length) {
        for (const e of result.errors) {
          if (e.includes(platformKey)) {
            setSyncErrors(prev => ({ ...prev, [platformKey]: e }));
          }
        }
      }

      fetchData();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSyncing(null);
    }
  };

  const handleRefreshAll = async () => {
    const connected = platforms.filter(p => isConnected(p.key));
    if (connected.length === 0) {
      toast.error('Chưa có nền tảng nào được kết nối.');
      return;
    }

    const syncable = connected.filter(p => p.syncVia !== 'unsupported');

    if (syncable.length === 0) {
      toast.info('Các nền tảng đã kết nối chưa hỗ trợ đồng bộ tự động.');
      return;
    }

    setSyncingAll(true);
    setSyncErrors({});
    toast.info(`Đang đồng bộ ${syncable.length} nền tảng...`);

    try {
      const metaPlatforms = syncable.filter(p => p.syncVia === 'meta');
      if (metaPlatforms.length > 0) {
        const res = await fetch('/api/marketing/sync/meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const result = await res.json();
        if (result?.results) {
          for (const r of result.results) {
            setSyncResults(prev => ({ ...prev, [r.platform]: r }));
            if (r.error) setSyncErrors(prev => ({ ...prev, [r.platform]: r.error }));
          }
        }
        if (res.ok && result?.success) {
          toast.success(result?.message || 'Đồng bộ Meta thành công');
        } else if (result?.error) {
          toast.error(result.error);
        }
      }

      const nonMeta = syncable.filter(p => p.syncVia !== 'meta');
      for (const p of nonMeta) {
        await handleSync(p.key);
      }

      fetchData();
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDisconnect = async (platformKey: string) => {
    try {
      await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, action: 'disconnect' }),
      });
      toast.success(`Ngắt kết nối ${platformKey}`);
      setSyncResults(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
      setSyncErrors(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
      setTokens(prev => { const c = { ...prev }; delete c[platformKey]; return c; });
      fetchData();
    } catch { toast.error('Lỗi ngắt kết nối'); }
  };

  const getBadge = (platformKey: string) => {
    const isSyncingThis = syncing === platformKey;
    const isTestingThis = testing === platformKey;
    const connected = isConnected(platformKey);
    const error = syncErrors[platformKey] || getTokenError(platformKey);
    const stored = hasStoredToken(platformKey);
    const unverified = needsVerification(platformKey);

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
    // Token đã lưu (từ Settings) nhưng chưa xác minh
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
          <p className="text-slate-500 text-sm mt-1">Quản lý kết nối và đồng bộ dữ liệu thật với các nền tảng</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefreshAll} disabled={syncing !== null || syncingAll}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-50 transition-colors">
            {syncingAll ? <Loader2 size={14} className="animate-spin" /> : <CloudDownload size={14} />}
            {syncingAll ? 'Đang đồng bộ...' : 'Đồng bộ tất cả'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <strong>Lưu ý:</strong> Chỉ hỗ trợ dữ liệu thật từ API. Nhập token thật và nhấn <strong>"Kiểm tra"</strong> để xác minh API. Trạng thái <strong>"Đã kết nối"</strong> chỉ hiển thị khi API test thành công. Nút <strong>"Đồng bộ dữ liệu"</strong> gọi API thật để lấy dữ liệu.
        </div>
      </div>

      {/* Unverified warning */}
      {unverifiedCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-orange-600 mt-0.5 shrink-0" />
          <div className="text-sm text-orange-800">
            <strong>{unverifiedCount} token chưa xác minh.</strong> Token đã được lưu từ trang Cài Đặt nhưng chưa được kiểm tra với API thật. Nhấn <strong>"Xác minh"</strong> để kiểm tra kết nối.
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-blue-50 text-blue-700">
          <p className="text-xs font-medium">Tổng nền tảng</p>
          <p className="text-2xl font-bold">{platforms.length}</p>
        </div>
        <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700">
          <p className="text-xs font-medium">Đã kết nối (xác minh)</p>
          <p className="text-2xl font-bold">{connectedCount}</p>
        </div>
        <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
          <p className="text-xs font-medium">Chưa xác minh</p>
          <p className="text-2xl font-bold">{unverifiedCount}</p>
        </div>
        <div className="rounded-xl p-4 bg-purple-50 text-purple-700">
          <p className="text-xs font-medium">Đã đồng bộ</p>
          <p className="text-2xl font-bold">{Object.keys(syncResults).length}</p>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {platforms.map(p => {
          const connected = isConnected(p.key);
          const lastTest = lastTested(p.key);
          const syncResult = syncResults[p.key];
          const syncError = syncErrors[p.key] || getTokenError(p.key);
          const isSyncing = syncing === p.key;
          const isTesting = testing === p.key;
          const stored = hasStoredToken(p.key);
          const unverified = needsVerification(p.key);
          return (
            <div key={p.key} className={`rounded-xl border ${p.color} p-5 space-y-3`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.key}</h3>
                    <p className="text-xs text-slate-500">{p.desc}</p>
                  </div>
                </div>
                {getBadge(p.key)}
              </div>

              {/* Error display */}
              {syncError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">{syncError}</p>
                </div>
              )}

              {/* Token input */}
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                placeholder={stored && !tokens[p.key] ? 'Token đã lưu — nhập mới để thay thế' : `Nhập API Token / Key cho ${p.key}`}
                type="password"
                value={tokens[p.key] || ''}
                onChange={e => setTokens(prev => ({ ...prev, [p.key]: e.target.value }))}
              />

              {/* Ad Account ID cho Facebook Ads */}
              {p.hasAdAccountId && (
                <input
                  className="w-full px-3 py-2 rounded-lg border text-sm bg-white"
                  placeholder="Ad Account ID (ví dụ: 123456789 hoặc act_123456789)"
                  value={adAccountIds[p.key] || ''}
                  onChange={e => setAdAccountIds(prev => ({ ...prev, [p.key]: e.target.value }))}
                />
              )}

              {/* Timestamps */}
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

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Nút kiểm tra / xác minh */}
                {!connected && stored && unverified && !tokens[p.key] ? (
                  <button onClick={() => handleTest(p.key)} disabled={isTesting || isSyncing}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                    Xác minh token đã lưu
                  </button>
                ) : (
                  <button onClick={() => handleTest(p.key)} disabled={isTesting || isSyncing}
                    className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm flex items-center gap-1.5 disabled:opacity-50 transition-colors">
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    Kiểm tra
                  </button>
                )}

                {/* Nút đồng bộ — chỉ hiện khi đã kết nối (đã xác minh) */}
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
                  <button onClick={() => handleDisconnect(p.key)}
                    className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 transition-colors">
                    Ngắt kết nối
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions */}
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
