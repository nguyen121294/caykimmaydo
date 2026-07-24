import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { Toaster } from 'sonner';
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MayDo Fashion - Central Dashboard',
  description: 'Hệ thống quản lý trung tâm cho MayDo Fashion - Thời trang may đo',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'MayDo Fashion - Central Dashboard',
    description: 'Hệ thống quản lý trung tâm cho MayDo Fashion',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div
          style={{
            fontFamily: 'Inter, Arial, Helvetica, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'geometricPrecision',
          }}
        >
          <Providers>
            {children}
            <Toaster position="top-right" richColors />
          </Providers>
        </div>
      </body>
      {gaId && gaId !== 'G-XXXXXXXXXX' && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
