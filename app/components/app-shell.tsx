'use client';

import { usePathname } from 'next/navigation';
import DashboardShell from './dashboard-shell';

const PUBLIC_PATHS = ['/login', '/login-admin', '/privacy', '/superadmin'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));

  return isPublicPath ? children : <DashboardShell>{children}</DashboardShell>;
}
