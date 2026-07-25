'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, UserPlus, LogOut, KeyRound, Mail, User, ShieldCheck, RefreshCw, Key, X } from 'lucide-react';
import { toast } from 'sonner';

interface UserAccount {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // User creation states
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [createLoading, setCreateLoading] = useState(false);

  // Users list states
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Reset Password Modal states
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/superadmin/users');
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        setIsAuthenticated(true);
      } else {
        toast.error(data.error || 'Không thể tải danh sách tài khoản');
      }
    } catch {
      toast.error('Lỗi kết nối API SuperAdmin');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) {
      toast.error('Vui lòng nhập Email và Mật khẩu SuperAdmin');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Xác thực SuperAdmin thành công!');
        setIsAuthenticated(true);
        fetchUsers();
      } else {
        toast.error(data.error || 'Thông tin SuperAdmin không chính xác');
      }
    } catch {
      toast.error('Lỗi hệ thống khi đăng nhập SuperAdmin');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/superadmin/logout', { method: 'POST' });
      setIsAuthenticated(false);
      toast.info('Đã đăng xuất khỏi cổng SuperAdmin');
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error('Yêu cầu điền đầy đủ Email và Mật khẩu');
      return;
    }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã tạo thành công tài khoản: ${data.user.email}`);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('user');
        fetchUsers();
      } else {
        toast.error(data.error || 'Không thể tạo tài khoản');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu tạo tài khoản');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForReset || !resetPasswordInput) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForReset.id,
          newPassword: resetPasswordInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã đổi mật khẩu thành công cho tài khoản: ${selectedUserForReset.email}`);
        setSelectedUserForReset(null);
        setResetPasswordInput('');
      } else {
        toast.error(data.error || 'Không thể cập nhật mật khẩu');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu đổi mật khẩu');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3 text-red-500 font-mono">
          <RefreshCw className="animate-spin" size={20} />
          <span>Đang kiểm tra quyền SuperAdmin...</span>
        </div>
      </div>
    );
  }

  // --- UNAUTHENTICATED LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-zinc-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/30 via-zinc-950 to-zinc-950 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-red-900/50 flex items-center justify-center shadow-2xl shadow-red-950/50 mb-4">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-zinc-100 uppercase">SuperAdmin Console</h1>
            <p className="text-xs text-zinc-500 mt-2 font-mono">Cổng quản trị tạo tài khoản hệ thống (Isolated Gate)</p>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 p-8 shadow-2xl">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 block flex items-center gap-2">
                  <Mail size={14} className="text-red-500" /> SuperAdmin Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition text-sm text-zinc-200 font-mono placeholder:text-zinc-700"
                  placeholder="admin@maydo.vn"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2 block flex items-center gap-2">
                  <KeyRound size={14} className="text-red-500" /> Master Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition text-sm text-zinc-200 font-mono placeholder:text-zinc-700"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-mono text-sm font-semibold uppercase tracking-wider transition shadow-lg shadow-red-950/50 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loginLoading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    Xác thực Quyền SuperAdmin
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-zinc-600 mt-6 font-mono">
            HỆ THỐNG CÔ LẬP NÀY CHỈ DÙNG ĐỂ KHỞI TẠO TÀI KHOẢN HỆ THỐNG.
          </p>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED SUPERADMIN PORTAL VIEW ---
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 text-zinc-200">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wider uppercase text-zinc-100">SuperAdmin Account Gateway</h1>
              <p className="text-xs text-zinc-500 font-mono">Trang khởi tạo & quản lý mật khẩu người dùng hệ thống</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-2 text-xs font-mono"
          >
            <LogOut size={14} className="text-red-500" /> Đăng xuất SuperAdmin
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Tạo Account */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-4">
                <UserPlus className="text-red-500" size={20} />
                <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Tạo Tài Khoản Mới</h2>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-mono uppercase text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                    <User size={13} className="text-zinc-500" /> Họ & Tên Người Dùng
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition text-sm text-zinc-200 placeholder:text-zinc-700"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                    <Mail size={13} className="text-zinc-500" /> Email Đăng Nhập
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition text-sm text-zinc-200 placeholder:text-zinc-700"
                    placeholder="nhanvien@maydo.vn"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                    <KeyRound size={13} className="text-zinc-500" /> Mật Khẩu Đăng Nhập
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition text-sm text-zinc-200 font-mono placeholder:text-zinc-700"
                    placeholder="Mật khẩu bảo mật"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-zinc-400 mb-1.5 block flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-zinc-500" /> Phân Quyền (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition text-sm text-zinc-200 font-mono"
                  >
                    <option value="user">user — Nhân viên chuẩn</option>
                    <option value="admin">admin — Quản lý hệ thống</option>
                    <option value="tailor">tailor — Thợ may / Kỹ thuật</option>
                    <option value="marketing">marketing — Chuyên viên Marketing</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-mono text-sm font-semibold uppercase tracking-wider transition shadow-lg shadow-red-950/40 disabled:opacity-50 flex items-center justify-center gap-2 pt-3"
                >
                  {createLoading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Khởi Tạo Tài Khoản & Mật Khẩu
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Bảng Danh sách Tài khoản */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                <div className="flex items-center gap-2">
                  <User className="text-red-500" size={20} />
                  <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wide">Tài Khoản Hệ Thống ({users.length})</h2>
                </div>
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5"
                >
                  <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} /> Tải lại
                </button>
              </div>

              {/* Input tìm kiếm */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Lọc theo Tên, Email hoặc Role..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder:text-zinc-700 outline-none focus:border-zinc-700 transition font-mono"
              />

              <div className="overflow-x-auto max-h-[460px] overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 font-mono text-xs">
                    {usersLoading ? 'Đang tải dữ liệu...' : 'Chưa có tài khoản nào được tạo'}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="p-3">Họ Tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/40 transition">
                          <td className="p-3 font-semibold text-zinc-200">{u.name || '—'}</td>
                          <td className="p-3 text-red-400">{u.email}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              u.role === 'admin' ? 'bg-red-950 text-red-400 border border-red-800/60' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setResetPasswordInput('');
                              }}
                              className="px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-red-400 hover:text-red-300 transition flex items-center gap-1 text-[11px]"
                              title="Đổi mật khẩu cho user này"
                            >
                              <Key size={12} /> Đổi MK
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RESET PASSWORD MODAL --- */}
      {selectedUserForReset && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedUserForReset(null)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="p-2.5 bg-red-950/50 border border-red-800/60 rounded-xl text-red-500">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Đổi Mật Khẩu Người Dùng</h3>
                <p className="text-xs text-zinc-400 font-mono">{selectedUserForReset.email}</p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-mono uppercase text-zinc-400 mb-1.5 block">Mật Khẩu Mới</label>
                <input
                  type="text"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-red-600 outline-none transition text-sm text-zinc-200 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 text-xs font-mono transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 flex items-center gap-2"
                >
                  {resetLoading ? <RefreshCw className="animate-spin" size={14} /> : 'Xác nhận Đổi MK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
