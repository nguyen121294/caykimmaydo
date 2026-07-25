'use client';
import { signIn, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/team'); // Chuyển thẳng tới trang quản lý Team (Tạo user)
    }
  }, [status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e?.preventDefault?.();
    if (!email || !password) {
      toast.error('Yêu cầu nhập thông tin hệ thống');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        toast.error('Thông tin xác thực quản trị không đúng');
      } else {
        router.replace('/team');
      }
    } catch {
      toast.error('Lỗi kết nối hệ thống');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900 via-zinc-950 to-zinc-950 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-zinc-100 tracking-tight">System Access</h1>
          <p className="text-sm text-zinc-500 mt-2 font-mono uppercase tracking-wider">SuperAdmin Gateway</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 block">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e: any) => setEmail(e?.target?.value ?? '')}
                className="w-full px-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition text-sm text-zinc-200 font-mono placeholder:text-zinc-700"
                placeholder="admin@system.local"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 block">Master Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e: any) => setPassword(e?.target?.value ?? '')}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 outline-none transition text-sm text-zinc-200 font-mono pr-10 placeholder:text-zinc-700"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-red-600/10 text-red-500 border border-red-600/20 font-mono text-sm uppercase tracking-wider hover:bg-red-600/20 hover:border-red-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                ) : (
                  <>
                    <LogIn size={16} />
                    Authorize Access
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-6 font-mono">
          UNAUTHORIZED ACCESS IS PROHIBITED
        </p>
      </div>
    </div>
  );
}
