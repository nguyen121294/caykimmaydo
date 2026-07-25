import React from 'react';

export const metadata = {
  title: 'SuperAdmin Access Gate — MayDo Management',
  description: 'Trang Quản trị Cô lập dành cho SuperAdmin',
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono antialiased selection:bg-red-500 selection:text-white">
      {children}
    </div>
  );
}
