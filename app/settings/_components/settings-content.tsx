'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Shield, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, Key, Lock, Plug, AlertTriangle, ShieldCheck } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

const platforms = [
  {
    id: 'facebook_oauth',
    name: 'Facebook & Instagram',
    icon: '📘',
    isOAuth: true,
    oauthUrl: '/api/oauth/facebook/authorize',
    guide: [
      'Nhấn "Kết Nối Facebook" để ủy quyền.',
      'Hệ thống tự lấy Token (60 ngày) cho Fanpage, Ads và Instagram.',
      'Vui lòng cấp tất cả các quyền được yêu cầu.'
    ],
  },
  {
    id: 'zalo',
    name: 'Zalo OA',
    icon: '💬',
    isOAuth: true,
    oauthUrl: '/api/oauth/zalo/authorize',
    guide: [
      'Nhấn "Kết Nối Zalo" để ủy quyền.',
      'Hệ thống tự lấy Token và tự động gia hạn (Refresh Token).'
    ],
  },
];

export default function SettingsContent() {
  const { data: session } = useSession();
  const isAdminSession = (session?.user as any)?.role === 'admin';

  const [credentials, setCredentials] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Meta App Credentials State
  const [metaClientId, setMetaClientId] = useState('');
  const [metaClientSecret, setMetaClientSecret] = useState('');
  const [hasMetaClientSecret, setHasMetaClientSecret] = useState(false);
  const [savingMetaApp, setSavingMetaApp] = useState(false);
  const [apiIsAdmin, setApiIsAdmin] = useState(false);

  const isAdmin = isAdminSession || apiIsAdmin;

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res?.json?.();
      setCredentials(json?.credentials ?? []);
      setApiIsAdmin(!!json?.isAdmin);
      if (json?.metaApp) {
        setMetaClientId(json.metaApp.clientId || '');
        setHasMetaClientSecret(!!json.metaApp.hasClientSecret);
      }
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const saveMetaAppCredentials = async () => {
    if (!isAdmin) {
      toast.error('Chỉ tài khoản Admin mới được phép chỉnh sửa cấu hình này.');
      return;
    }
    if (!metaClientId && !metaClientSecret) {
      toast.error('Vui lòng nhập Facebook App ID hoặc App Secret');
      return;
    }
    setSavingMetaApp(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'Meta App Credentials',
          credentials: {
            clientId: metaClientId,
            clientSecret: metaClientSecret,
          },
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Đã lưu cấu hình Facebook App ID & App Secret thành công!');
        setMetaClientSecret('');
        fetchData();
      } else {
        toast.error(result?.error || 'Lỗi lưu cấu hình Meta App');
      }
    } catch {
      toast.error('Lỗi kết nối server');
    } finally {
      setSavingMetaApp(false);
    }
  };

  const isConnected = (platformId: string) => {
    if (platformId === 'facebook_oauth') {
      return (credentials ?? []).some((c: any) => ['Facebook Page', 'Facebook Ads', 'Instagram'].includes(c.platform) && c.isConnected);
    }
    if (platformId === 'zalo') {
      return (credentials ?? []).some((c: any) => c.platform === 'Zalo' && c.isConnected);
    }
    return (credentials ?? [])?.find?.((c: any) => c?.platform === platformId)?.isConnected ?? false;
  };

  const updateField = (platformId: string, fieldKey: string, value: string) => {
    setFormData((prev: any) => ({
      ...(prev ?? {}),
      [platformId]: { ...(prev?.[platformId] ?? {}), [fieldKey]: value },
    }));
  };

  const saveCredentials = async (platformId: string) => {
    if (!isAdmin) {
      toast.error('Chỉ tài khoản Admin mới được phép chỉnh sửa cấu hình này.');
      return;
    }
    const creds = formData?.[platformId] ?? {};
    if (Object.values(creds ?? {})?.every?.((v: any) => !v)) {
      toast.error('Vui lòng nhập thông tin');
      return;
    }
    setSaving(platformId);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformId, credentials: creds }),
      });
      const result = await res?.json?.().catch(() => ({}));
      if (res?.ok) {
        toast.success('Token đã lưu! Vào trang Kết Nối Nền Tảng để kiểm tra và xác minh.', { duration: 5000 });
        fetchData();
      } else {
        toast.error(result?.error || 'Lỗi lưu');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setSaving(null); }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) { toast.error('Vui lòng nhập đầy đủ'); return; }
    setChangingPw(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res?.json?.();
      if (res?.ok) {
        toast.success('Đổi mật khẩu thành công!');
        setCurrentPw('');
        setNewPw('');
      } else {
        toast.error(json?.error ?? 'Lỗi đổi mật khẩu');
      }
    } catch { toast.error('Lỗi kết nối'); }
    finally { setChangingPw(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Cài Đặt & Kết Nối" description="Cấu hình kết nối nền tảng và tài khoản" icon={Settings} onRefresh={fetchData} />

      {/* RBAC Notice Banner */}
      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-sm font-medium">Chế độ chỉ xem: Bạn cần tài khoản có vai trò <strong>Admin</strong> để cài đặt hoặc chỉnh sửa API Keys.</span>
          </div>
          <span className="text-xs bg-amber-200 text-amber-900 font-semibold px-2.5 py-1 rounded-full">User View</span>
        </div>
      )}

      {/* Meta App OAuth Configuration Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-slate-900">Cấu hình App Facebook OAuth (App ID & Secret)</h3>
              <p className="text-xs text-slate-500">Dùng cho tính năng "Ủy quyền tự động qua Facebook". Nếu không nhập, hệ thống sẽ dùng file .env làm mặc định.</p>
            </div>
          </div>
          {hasMetaClientSecret && (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> App Secret đã thiết lập
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">FACEBOOK_CLIENT_ID (App ID)</label>
            <div className="relative">
              <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                disabled={!isAdmin}
                value={metaClientId}
                onChange={(e) => setMetaClientId(e.target.value)}
                placeholder="Ví dụ: 123456789012345"
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 mb-1 block">FACEBOOK_CLIENT_SECRET (App Secret)</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                disabled={!isAdmin}
                value={metaClientSecret}
                onChange={(e) => setMetaClientSecret(e.target.value)}
                placeholder={hasMetaClientSecret ? '•••••••••••••••• (Để trống nếu không đổi)' : 'Nhập Facebook App Secret'}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={saveMetaAppCredentials}
            disabled={!isAdmin || savingMetaApp}
            className="px-4 py-2 text-sm gradient-bg text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
          >
            {savingMetaApp ? 'Đang lưu...' : 'Lưu Cấu Hình App Meta'}
          </button>
        </div>
      </div>

      {/* Platform Connections */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} className="text-indigo-500" />
          Kết Nối Nền Tảng
        </h2>

        {(platforms ?? [])?.map?.((p: any) => (
          <div key={p?.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p?.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{p?.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isConnected(p?.id) ? (
                        <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Đã kết nối</span></>
                      ) : (
                        <><XCircle className="w-3.5 h-3.5 text-red-400" /><span className="text-xs text-red-500 font-medium">Chưa kết nối</span></>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setExpandedGuide(expandedGuide === p?.id ? null : p?.id)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  Hướng dẫn
                  {expandedGuide === p?.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Guide */}
              {expandedGuide === p?.id && (
                <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                  <h4 className="text-xs font-semibold text-indigo-700 mb-2">Hướng dẫn lấy thông tin xác thực:</h4>
                  <ol className="space-y-1">
                    {(p?.guide ?? [])?.map?.((step: string, i: number) => (
                      <li key={i} className="text-xs text-indigo-600">{step}</li>
                    ))}
                  </ol>
                  {p?.link && (
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-2 text-xs text-indigo-700 font-medium hover:underline">
                      <ExternalLink size={10} /> Mở trang developer
                    </a>
                  )}
                </div>
              )}

              {/* Fields or OAuth Button */}
              {p?.isOAuth ? (
                <div className="mt-4 flex items-center gap-2">
                  {isAdmin ? (
                    <a href={p.oauthUrl} className="px-4 py-2 text-sm gradient-bg text-white rounded-lg hover:opacity-90 transition font-medium inline-flex items-center gap-2">
                      <Plug size={16} /> Kết Nối {p.name}
                    </a>
                  ) : (
                    <button disabled className="px-4 py-2 text-sm bg-slate-200 text-slate-500 rounded-lg font-medium inline-flex items-center gap-2 cursor-not-allowed">
                      <Plug size={16} /> Yêu cầu Admin để kết nối
                    </button>
                  )}
                  <a href="/connections" className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium inline-flex items-center">
                    Kiểm Tra Trạng Thái
                  </a>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(p?.fields ?? [])?.map?.((field: any) => (
                      <div key={field?.key}>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">{field?.label}</label>
                        <div className="relative">
                          <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={field?.type ?? 'text'}
                            disabled={!isAdmin}
                            value={formData?.[p?.id]?.[field?.key] ?? ''}
                            onChange={(e: any) => updateField(p?.id, field?.key, e?.target?.value ?? '')}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:bg-slate-100 disabled:text-slate-500"
                            placeholder={isConnected(p?.id) ? '***configured***' : `Nhập ${field?.label}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => saveCredentials(p?.id)}
                      disabled={!isAdmin || saving === p?.id}
                      className="px-4 py-2 text-sm gradient-bg text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
                    >
                      {saving === p?.id ? 'Đang lưu...' : 'Lưu Thông Tin'}
                    </button>
                    <a
                      href="/connections"
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium inline-flex items-center"
                    >
                      Kiểm Tra Kết Nối
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )) ?? []}
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Lock size={16} className="text-purple-500" />
          Đổi Mật Khẩu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPw}
              onChange={(e: any) => setCurrentPw(e?.target?.value ?? '')}
              className="w-full px-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Mật khẩu mới</label>
            <input
              type="password"
              value={newPw}
              onChange={(e: any) => setNewPw(e?.target?.value ?? '')}
              className="w-full px-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <button
          onClick={changePassword}
          disabled={changingPw}
          className="mt-3 px-4 py-2 text-sm gradient-bg text-white rounded-lg hover:opacity-90 transition font-medium disabled:opacity-50"
        >
          {changingPw ? 'Đang đổi...' : 'Đổi Mật Khẩu'}
        </button>
      </div>
    </div>
  );
}

