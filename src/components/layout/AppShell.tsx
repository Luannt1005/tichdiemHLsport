'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { authStore } from '@/lib/auth/auth-store';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '@/components/ui/Toast';
import { BrandLogo } from '@/components/ui/BrandLogo';

const PUBLIC_PATHS = ['/login', '/register', '/dang-ky', '/lookup', '/tra-cuu'];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    const checkAuth = () => {
      const auth = authStore.isAuthenticated();
      setIsAuthenticated(auth);
      setIsAuthChecked(true);

      if (!auth && !isPublicPath) {
        router.replace('/login');
      }
    };

    checkAuth();
    const unsubscribe = authStore.subscribe(() => {
      checkAuth();
    });

    return () => unsubscribe();
  }, [pathname, router, isPublicPath]);

  // Xác minh lại phiên với server mỗi lần vào trang nội bộ (cookie hết hạn / bị khóa → về /login)
  useEffect(() => {
    if (!isPublicPath) authStore.refresh();
  }, [isPublicPath]);

  // If on public pages (login, lookup, tra-cuu), render clean page without sidebar/header
  if (isPublicPath) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  // Show loading spinner while checking auth status
  if (!isAuthChecked || !isAuthenticated) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 p-2 rounded-2xl bg-[#1B6C39] flex items-center justify-center text-white shadow-xl mb-4 animate-pulse">
            <BrandLogo className="w-full h-full" variant="white" />
          </div>
          <div className="text-sm font-bold text-slate-300">
            Đang tải hệ thống HL Badminton...
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        {/* Sidebar */}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
          <Header onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
