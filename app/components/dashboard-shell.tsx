'use client';
import Sidebar from './sidebar';
import ErrorBoundary from './error-boundary';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary fallbackTitle="Lỗi hiển thị sidebar">
        <Sidebar />
      </ErrorBoundary>
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          <ErrorBoundary fallbackTitle="Lỗi hiển thị nội dung trang">
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
