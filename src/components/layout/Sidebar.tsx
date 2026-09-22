'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  History,
  Settings,
  ScrollText,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { authStore } from '@/lib/auth/auth-store';
import { AppUser } from '@/types/database';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: 'Khách hàng',
    href: '/customers',
    icon: Users,
  },
  {
    title: 'Lịch sử giao dịch',
    href: '/history',
    icon: History,
  },
  {
    title: 'Tổng quan',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Nhật ký hoạt động',
    href: '/logs',
    icon: ScrollText,
  },
  {
    title: 'Cài đặt tích điểm',
    href: '/settings',
    icon: Settings,
    adminOnly: true,
  },
  {
    title: 'Quản trị hệ thống',
    href: '/admin',
    icon: ShieldCheck,
    adminOnly: true,
  },
];

// Custom Badminton Shuttlecock SVG Icon
function ShuttlecockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Shuttlecock cork base */}
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0l-.5-2.5h-4l-.5 2.5z" fill="currentColor" />
      {/* Lower connecting band */}
      <path d="M7 12h10" />
      {/* Upper connecting band */}
      <path d="M5.5 8h13" />
      {/* Outer feathers */}
      <path d="M4 4l4 11" />
      <path d="M20 4l-4 11" />
      {/* Inner feather ribs */}
      <path d="M9 4.5l1 10.5" />
      <path d="M15 4.5l-1 10.5" />
      <path d="M12 4v11" />
    </svg>
  );
}

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setCurrentUser(authStore.getCurrentUser());
    const unsub = authStore.subscribe((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || currentUser?.role === 'ADMIN'
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container with Court Green Gradient */}
      <aside
        style={{
          background: 'linear-gradient(180deg, #207D43 0%, #1B6C39 40%, #134F29 100%)',
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col text-white transition-all duration-300 ease-in-out border-r border-[#15592e] shadow-xl ${
          collapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#15592e]">
          <Link href="/" className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white text-[#1B6C39] shadow-md shrink-0">
              <ShuttlecockIcon className="w-6 h-6" />
            </div>
            {!collapsed && (
              <span className="font-black text-lg tracking-tight text-white truncate">
                HL Badminton
              </span>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.title : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#1B6C39] shadow-md'
                    : 'text-emerald-100 hover:bg-black/15 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#1B6C39]' : 'text-emerald-200 group-hover:text-white'
                  }`}
                />
                {!collapsed && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="truncate">{item.title}</span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md ${
                          item.badgeColor || 'bg-black/20 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Collapse / Expand Toggle */}
        <div className="hidden lg:flex items-center justify-between p-3 border-t border-[#15592e]">
          {!collapsed && (
            <div className="flex flex-col text-[11px] text-emerald-200/80">
              <span className="font-semibold text-white">Hệ thống Tích Điểm HL</span>
              <span className="text-emerald-300/70 text-[10px]">HL Badminton Sport</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 text-emerald-200 hover:text-white hover:bg-black/20 rounded-lg transition-colors mx-auto"
            title={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
