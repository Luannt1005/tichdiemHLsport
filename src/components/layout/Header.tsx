'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Menu,
  ShieldCheck,
  User,
  LogOut,
  ScrollText,
  ChevronDown,
  UserCircle,
  Sparkles,
} from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { authStore } from '@/lib/auth/auth-store';
import { activityLogService } from '@/lib/services/activity-log-service';
import { AppUser, UserRole } from '@/types/database';
import { useToast } from '@/components/ui/Toast';
import { AccountProfileModal } from '@/components/auth/AccountProfileModal';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Tổng quan Hệ thống', subtitle: 'Theo dõi tổng quan vòng đời và lưu hành điểm' },
  '/customers': { title: 'Quản lý Khách hàng', subtitle: 'Danh sách và hồ sơ điểm của khách chơi sân' },
  '/history': { title: 'Lịch sử Biến Động Điểm', subtitle: 'Audit log minh bạch toàn bộ giao dịch điểm' },
  '/logs': { title: 'Nhật Ký Hoạt Động', subtitle: 'Ghi nhận lịch sử thao tác của các tài khoản trên hệ thống' },
  '/settings': { title: 'Cài đặt Tích Điểm', subtitle: 'Cấu hình tỷ lệ quy đổi, làm tròn và số ngày hết hạn' },
};

export function Header({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { info, success } = useToast();

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentUser(authStore.getCurrentUser());
    const unsub = authStore.subscribe((user) => {
      setCurrentUser(user);
    });

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsub();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    if (currentUser) {
      await activityLogService.logActivity(
        'LOGOUT',
        'AUTH',
        currentUser.id,
        `Tài khoản ${currentUser.name} (@${currentUser.username}) đã đăng xuất khỏi hệ thống`,
        { username: currentUser.username, role: currentUser.role }
      );
    }

    await authStore.logout();
    setShowUserDropdown(false);
    setShowProfileModal(false);
    info('Đã đăng xuất', 'Phiên làm việc đã kết thúc thành công');
    router.replace('/login');
  };

  const currentInfo = pageTitles[pathname] || {
    title: 'Hệ thống Tích Điểm',
    subtitle: 'Quản lý điểm thành viên sân cầu lông HL Sport',
  };

  const role = currentUser?.role || 'ADMIN';
  const initialLetter = (currentUser?.name || 'A').charAt(0).toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 backdrop-blur-md border-b border-slate-200">
        {/* Left section: Hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {currentInfo.title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 font-medium">
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right section: Account & Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* User Account Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all shadow-sm group"
            >
              {/* Avatar circle */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-xs ${
                  role === 'ADMIN'
                    ? 'bg-gradient-to-br from-[#207D43] to-[#134F29]'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                }`}
              >
                {initialLetter}
              </div>

              {/* User Name & Role Pill */}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px]">
                  {currentUser?.name || 'Tài khoản'}
                </span>
                <span
                  className={`text-[10px] font-black tracking-wide uppercase ${
                    role === 'ADMIN' ? 'text-emerald-700' : 'text-blue-700'
                  }`}
                >
                  {role === 'ADMIN' ? 'Admin' : 'Thu Ngân'}
                </span>
              </div>

              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform" />
            </button>

            {/* Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-fade-in divide-y divide-slate-100">
                {/* Account Header */}
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Đang đăng nhập với
                  </p>
                  <p className="text-sm font-bold text-slate-900 truncate mt-0.5">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">
                    @{currentUser?.username} • {role}
                  </p>
                </div>

                {/* Navigation Options */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowProfileModal(true);
                    }}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  >
                    <UserCircle className="w-4 h-4 text-slate-500" />
                    <span>Hồ sơ tài khoản</span>
                  </button>

                  <Link
                    href="/logs"
                    onClick={() => setShowUserDropdown(false)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                  >
                    <ScrollText className="w-4 h-4 text-slate-500" />
                    <span>Nhật ký hoạt động</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-rose-600 hover:bg-rose-50 font-bold"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Account Profile Modal */}
      <AccountProfileModal
        user={currentUser}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onLogout={handleLogout}
      />
    </>
  );
}
