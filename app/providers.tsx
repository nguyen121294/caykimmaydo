'use client';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import ErrorBoundary from './components/error-boundary';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallbackTitle="Đã xảy ra lỗi ứng dụng">
      <SessionProvider>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
