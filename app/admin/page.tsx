'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '../components/page-header';
import { UserPlus, Users, KeyRound, Mail, User, ShieldCheck, RefreshCw, Search, Key, X } from 'lucide-react';
import { toast } from 'sonner';

interface UserAccount {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export default function AdminManagementPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Reset Password Modal states
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserAccount | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        toast.error(data.error || 'Không thể tải danh sách tài khoản');
      }
    } catch {
      toast.error('Lỗi khi tải dữ liệu tài khoản');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập Email và Mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã tạo thành công tài khoản: ${data.user.email}`);
        setName('');
        setEmail('');
        setPassword('');
        setRole('user');
        fetchUsers();
      } else {
        toast.error(data.error || 'Không thể tạo tài khoản');
      }
    } catch {
      toast.error('Lỗi khi gửi yêu cầu tạo tài khoản');
    } finally {
      setLoading(false);
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
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForReset.id,
          newPassword: resetPasswordInput,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Đã đổi mật khẩu thành công cho: ${selectedUserForReset.email}`);
        setSelectedUserForReset(null);
        setResetPasswordInput('');
      } else {
        toast.error(data.error || 'Không thể đổi mật khẩu');
      }
    } catch {
      toast.error('Lỗi khi đổi mật khẩu người dùng');
    } finally {
      setResetLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 -m-4 md:-m-6 lg:-m-8 p-4 lg:p-8">
      <main className="space-y-6">
        <PageHeader
          title="Quản Trị Người Dùng"
          description="Tạo tài khoản mới & Quản lý phân quyền nhân viên hệ thống"
          icon={ShieldCheck}
          onRefresh={fetchUsers}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Tạo User */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Tạo Tài Khoản Mới</h2>
                  <p className="text-xs text-slate-500">Tạo tài khoản & mật khẩu cho nhân viên</p>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <User size={14} className="text-indigo-600" /> Họ & Tên
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Mail size={14} className="text-indigo-600" /> Email Đăng Nhập *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nhanvien@maydo.vn"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-indigo-600" /> Mật Khẩu *
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-indigo-600" /> Phân Quyền (Role)
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm"
                  >
                    <option value="user">user — Nhân viên chuẩn</option>
                    <option value="admin">admin — Quản trị viên</option>
                    <option value="tailor">tailor — Thợ may / Kỹ thuật</option>
                    <option value="marketing">marketing — Chuyên viên Marketing</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Tạo Tài Khoản
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Bảng Danh sách Users */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                    <Users size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Danh Sách Người Dùng ({users.length})</h2>
                    <p className="text-xs text-slate-500">Các tài khoản đã được cấp quyền trong hệ thống</p>
                  </div>
                </div>
                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition flex items-center gap-1.5 border border-slate-200"
                >
                  <RefreshCw size={13} className={usersLoading ? 'animate-spin' : ''} /> Tải lại
                </button>
              </div>

              {/* Search filter */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Lọc theo Tên, Email hoặc Role..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-xs"
                />
              </div>

              <div className="overflow-x-auto max-h-[480px] overflow-y-auto pr-1">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {usersLoading ? 'Đang tải danh sách...' : 'Không tìm thấy người dùng phù hợp'}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Họ Tên</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                        <th className="p-3 text-right">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-semibold text-slate-900">{u.name || '—'}</td>
                          <td className="p-3 text-indigo-600 font-medium">{u.email}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedUserForReset(u);
                                setResetPasswordInput('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-medium transition inline-flex items-center gap-1 text-[11px]"
                              title="Đổi mật khẩu cho người dùng này"
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
      </main>

      {/* --- RESET PASSWORD MODAL --- */}
      {selectedUserForReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4 text-slate-900">
            <button
              onClick={() => setSelectedUserForReset(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
                <Key size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đổi Mật Khẩu Người Dùng</h3>
                <p className="text-xs text-indigo-600 font-mono">{selectedUserForReset.email}</p>
              </div>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block">
                  Mật Khẩu Mới *
                </label>
                <input
                  type="text"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition text-sm font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForReset(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition border border-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
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
