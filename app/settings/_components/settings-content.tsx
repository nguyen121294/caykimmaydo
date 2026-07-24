'use client';
import { useEffect, useState } from 'react';
import { Settings, Shield, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink, Key, Lock } from 'lucide-react';
import PageHeader from '@/app/components/page-header';
import { toast } from 'sonner';

const platforms = [
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    icon: '📊',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
      { key: 'ad_account_id', label: 'Ad Account ID', type: 'text' },
    ],
    guide: [
      'Bước 1: Truy cập business.facebook.com > Cài đặt doanh nghiệp',
      'Bước 2: Vào mục "Tài khoản" > "Tài khoản quảng cáo"',
      'Bước 3: Chọn tài khoản quảng cáo cần kết nối',
      'Bước 4: Vào developers.facebook.com > Tạo App',
      'Bước 5: Vào Tools > Graph API Explorer',
      'Bước 6: Chọn các quyền: ads_read, ads_management, read_insights',
      'Bước 7: Tạo Long-lived Access Token (60 ngày)',
      'Bước 8: Dán Access Token và Ad Account ID vào đây',
    ],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    fields: [
      { key: 'access_token', label: 'Access Token', type: 'password' },
    ],
    guide: [
      'Bước 1: Kết nối Instagram với Facebook Page',
      'Bước 2: Vào developers.facebook.com > Tạo App',
      'Bước 3: Thêm Instagram Graph API',
      'Bước 4: Tạo token với quyền instagram_basic, instagram_content_publish',
      'Bước 5: Dán Access Token vào đây',
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook Page',
    icon: '📘',
    fields: [
      { key: 'page_access_token', label: 'Page Access Token', type: 'password' },
      { key: 'page_id', label: 'Page ID', type: 'text' },
    ],
    guide: [
      'Bước 1: Vào Facebook Page cần kết nối',
      'Bước 2: Vào business.facebook.com > Cài đặt doanh nghiệp > Tài khoản > Trang',
      'Bước 3: Lấy Page ID từ About section của Page',
      'Bước 4: Tạo Page Access Token từ Graph API Explorer',
      'Bước 5: Chọn quyền: pages_read_engagement, pages_manage_posts',
    ],
  },
  {
    id: 'zalo',
    name: 'Zalo OA',
    icon: '💬',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text' },
      { key: 'secret_key', label: 'Secret Key', type: 'password' },
    ],
    guide: [
      'Bước 1: Truy cập developers.zalo.me',
      'Bước 2: Tạo ứng dụng mới hoặc chọn ứng dụng có sẵn',
      'Bước 3: Vào mục "Thông tin ứng dụng"',
      'Bước 4: Copy App ID và Secret Key',
      'Bước 5: Dán vào các trường tương ứng ở đây',
    ],
    link: 'https://developers.zalo.me',
  },
];

export default function SettingsContent() {
  const [credentials, setCredentials] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res?.json?.();
      setCredentials(json?.credentials ?? []);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const isConnected = (platformId: string) => {
    return (credentials ?? [])?.find?.((c: any) => c?.platform === platformId)?.isConnected ?? false;
  };

  const updateField = (platformId: string, fieldKey: string, value: string) => {
    setFormData((prev: any) => ({
      ...(prev ?? {}),
      [platformId]: { ...(prev?.[platformId] ?? {}), [fieldKey]: value },
    }));
  };

  const saveCredentials = async (platformId: string) => {
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

      {/* Platform Connections */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} className="text-indigo-500" />
          Kết Nối Nền Tảng
        </h2>

        {(platforms ?? [])?.map?.((p: any) => (
          <div key={p?.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
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

              {/* Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(p?.fields ?? [])?.map?.((field: any) => (
                  <div key={field?.key}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">{field?.label}</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={field?.type ?? 'text'}
                        value={formData?.[p?.id]?.[field?.key] ?? ''}
                        onChange={(e: any) => updateField(p?.id, field?.key, e?.target?.value ?? '')}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        placeholder={isConnected(p?.id) ? '***configured***' : `Nhập ${field?.label}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => saveCredentials(p?.id)}
                  disabled={saving === p?.id}
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
            </div>
          </div>
        )) ?? []}
      </div>

      {/* Password Change */}
      <div className="bg-white rounded-xl shadow-sm p-5">
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
