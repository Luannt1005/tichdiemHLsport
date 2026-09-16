'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Bell,
  ShieldCheck,
  User,
  Database,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { UserRole } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Tổng quan Hệ thống', subtitle: 'Theo dõi tổng quan vòng đời và lưu hành điểm' },
  '/customers': { title: 'Quản lý Khách hàng', subtitle: 'Danh sách và hồ sơ điểm của khách chơi sân' },
  '/history': { title: 'Lịch sử Biến Động Điểm', subtitle: 'Audit log minh bạch toàn bộ giao dịch điểm' },
  '/settings': { title: 'Cài đặt Tích Điểm', subtitle: 'Cấu hình tỷ lệ quy đổi, làm tròn và số ngày hết hạn' },
};

export function Header({
  onMenuClick,
}: {
  onMenuClick: () => void;
}) {
  const pathname = usePathname();
  const { info, success } = useToast();
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    setRole(loyaltyStore.getRole());
    loyaltyStore.checkSupabaseConnection().then((live) => setIsLive(live));
  }, []);

  const handleToggleRole = (newRole: UserRole) => {
    loyaltyStore.setRole(newRole);
    setRole(newRole);
    setShowRoleMenu(false);
    info('Chuyển đổi phân quyền', `Bạn hiện đang xem với vai trò ${newRole}`);
  };

  const handleResetData = () => {
    if (window.confirm('Bạn có chắc muốn nạp lại dữ liệu mẫu ban đầu cho 10 khách hàng?')) {
      loyaltyStore.resetToSampleData();
      success('Đã nạp lại dữ liệu mẫu', 'Hệ thống đã khôi phục 10 khách hàng và lịch sử giao dịch ban đầu');
      window.location.reload();
    }
  };

  const currentInfo = pageTitles[pathname] || {
    title: 'Hệ thống Tích Điểm',
    subtitle: 'Quản lý điểm thành viên sân cầu lông HL Sport',
  };

  return (
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

      {/* Right section: System Status, Role Switcher, Account */}
      <div className="flex items-center gap-2 sm:gap-4">


        {/* Role Switcher Pill (Admin / Staff) */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all shadow-sm"
          >
            {role === 'ADMIN' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <User className="w-4 h-4 text-blue-600" />
            )}
            <span>{role === 'ADMIN' ? 'Admin Sân' : 'Nhân Viên Thu Ngân'}</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-100">
                Chuyển đổi vai trò test
              </div>
              <button
                onClick={() => handleToggleRole('ADMIN')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                  role === 'ADMIN' ? 'font-bold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>ADMIN (Toàn quyền cấu hình)</span>
                </div>
                {role === 'ADMIN' && <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
              <button
                onClick={() => handleToggleRole('STAFF')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                  role === 'STAFF' ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span>STAFF (Chỉ thu ngân & tích điểm)</span>
                </div>
                {role === 'STAFF' && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
