'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Settings, Lock, AlertTriangle } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

export default function SettingsContent() {
  const { data: session } = useSession();
  const isAdminSession = (session?.user as any)?.role === 'admin';

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
      <PageHeader title="Cài Đặt Tài Khoản" description="Quản lý bảo mật và cấu hình tài khoản" icon={Settings} onRefresh={fetchData} />

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
