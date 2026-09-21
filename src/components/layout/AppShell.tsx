'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '@/components/ui/Toast';
import { authStore } from '@/lib/auth/auth-store';

const PUBLIC_PATHS = ['/login', '/register', '/dang-ky', '/lookup', '/tra-cuu'];

export function AppShell({ children }: { children: React.ReactNode }) {
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

  // If on public pages (login, lookup, tra-cuu), render clean page without sidebar/header
  if (isPublicPath) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  // Show loading spinner while checking auth status
  if (!isAuthChecked || !isAuthenticated) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1B6C39] flex items-center justify-center text-white shadow-xl mb-4 animate-pulse">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7"
            >
              <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0l-.5-2.5h-4l-.5 2.5z" fill="currentColor" />
              <path d="M7 12h10" />
              <path d="M5.5 8h13" />
              <path d="M4 4l4 11" />
              <path d="M20 4l-4 11" />
              <path d="M9 4.5l1 10.5" />
              <path d="M15 4.5l-1 10.5" />
              <path d="M12 4v11" />
            </svg>
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
