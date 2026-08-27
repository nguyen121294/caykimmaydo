'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, BarChart3, Film, Package, MessageSquare,
  Users, Bell, Settings, BookOpen, Menu, X, LogOut, Scissors,
  UserCheck, Kanban, Megaphone, MessageCircle, Wallet,
  FileSpreadsheet, Plug, ChevronDown, ChevronRight, ShieldCheck, Share2, Camera, RefreshCw, Calendar
} from 'lucide-react';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Tổng quan',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/analytics', label: 'Phân Tích', icon: BarChart3 },
    ]
  },
  {
    label: 'Bán hàng',
    items: [
      { href: '/crm', label: 'CRM Khách hàng', icon: UserCheck },
      { href: '/sales', label: 'Sales Pipeline', icon: Kanban },
      { href: '/care', label: 'Lịch Hẹn & CSKH', icon: Calendar },
      { href: '/orders', label: 'Đơn Hàng', icon: Package },
    ]
  },
  {
    label: 'Vận hành',
    items: [
      { href: '/team', label: 'Quy Trình Team', icon: Users },
      { href: '/posts', label: 'Quản Lý Bài Đăng', icon: Share2 },
      { href: '/content', label: 'Kho Nội Dung', icon: Film },
      { href: '/inbox', label: 'Kịch Bản Inbox', icon: MessageSquare },
    ]
  },
  {
    label: 'Marketing',
    items: [
      { href: '/marketing', label: 'Marketing', icon: Megaphone },
      { href: '/manychat', label: 'ManyChat', icon: MessageCircle },
    ]
  },
  {
    label: 'Hệ thống',
    items: [
      { href: '/sync-hub', label: 'Đồng Bộ Hub', icon: RefreshCw },
      { href: '/finance', label: 'Tài Chính', icon: Wallet, adminOnly: true },
      { href: '/import-export', label: 'Import / Export', icon: FileSpreadsheet },
      { href: '/connections', label: 'Kết Nối', icon: Plug },
      { href: '/automation', label: 'Nhật Ký', icon: Bell },
      { href: '/settings', label: 'Cài Đặt', icon: Settings },
      { href: '/admin', label: 'Quản Trị', icon: ShieldCheck, adminOnly: true },
    ]
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession() || {};
  const [open, setOpen] = useState(false);
  const userRole = (session?.user as any)?.role;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white rounded-lg p-2 shadow-md"
        aria-label="Toggle menu"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-40 transition-transform duration-300 flex flex-col
          bg-gradient-to-b from-indigo-950 via-purple-950 to-indigo-950
          ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-sm">MayDo Fashion</h1>
            <p className="text-[10px] text-purple-300">Central Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navGroups?.map((group: any) => {
            const visibleItems = group?.items?.filter((item: any) => !item?.adminOnly || userRole === 'admin');
            if (!visibleItems || visibleItems.length === 0) return null;

            return (
              <div key={group?.label}>
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400/70">
                  {group?.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item: any) => {
                    const isActive = pathname?.startsWith(item?.href);
                    const Icon = item?.icon;
                    return (
                      <Link
                        key={item?.href}
                        href={item?.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200
                          ${isActive
                            ? 'bg-white/15 text-white font-medium shadow-sm'
                            : 'text-purple-200 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Icon size={16} />
                        <span>{item?.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-xs font-bold">
              {session?.user?.name?.[0]?.toUpperCase?.() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session?.user?.name ?? 'User'}</p>
              <p className="text-[10px] text-purple-300 truncate">{session?.user?.email ?? ''}</p>
            </div>
            <button
              onClick={() => signOut?.({ callbackUrl: '/login' })}
              className="p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-white/10 transition"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
