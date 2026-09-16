import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Hệ thống Tích Điểm Sân Cầu Lông - HL Sport',
  description: 'Quản lý tích điểm thành viên, FEFO Point Lots Ledger, và ưu đãi tiền sân cầu lông',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <body className={`${inter.className} min-h-full bg-slate-50 text-slate-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
