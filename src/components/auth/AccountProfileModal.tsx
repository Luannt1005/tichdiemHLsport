'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Mail,
  Calendar,
  Clock,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AppUser } from '@/types/database';
import { authStore } from '@/lib/auth/auth-store';
import { activityLogService } from '@/lib/services/activity-log-service';
import { useToast } from '@/components/ui/Toast';

interface AccountProfileModalProps {
  user: AppUser | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export function AccountProfileModal({
  user,
  isOpen,
  onClose,
  onLogout,
}: AccountProfileModalProps) {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'INFO' | 'PASSWORD'>('INFO');

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  if (!isOpen || !user) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');

    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPwError('Vui lòng điền đầy đủ các trường mật khẩu');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    setPwLoading(true);
    try {
      const res = await authStore.changePassword(oldPassword, newPassword);
      if (res.success) {
        await activityLogService.logActivity(
          'SETTINGS_UPDATE',
          'AUTH',
          user.id,
          `Người dùng ${user.name} (${user.username}) đã thay đổi mật khẩu tài khoản`,
          { username: user.username }
        );

        success('Đổi mật khẩu thành công', 'Mật khẩu của bạn đã được cập nhật an toàn');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setActiveTab('INFO');
      } else {
        setPwError(res.error || 'Đổi mật khẩu thất bại');
      }
    } catch (err: any) {
      setPwError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setPwLoading(false);
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Chưa ghi nhận';
    try {
      return new Date(isoStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
                user.role === 'ADMIN'
                  ? 'bg-gradient-to-br from-[#207D43] to-[#134F29]'
                  : 'bg-gradient-to-br from-blue-600 to-indigo-700'
              }`}
            >
              {user.role === 'ADMIN' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <User className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Hồ Sơ Tài Khoản
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Thông tin người dùng và phân quyền hệ thống
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-white">
          <button
            onClick={() => setActiveTab('INFO')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'INFO'
                ? 'border-[#1B6C39] text-[#1B6C39]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Thông tin tài khoản</span>
          </button>
          <button
            onClick={() => setActiveTab('PASSWORD')}
            className={`pb-3 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'PASSWORD'
                ? 'border-[#1B6C39] text-[#1B6C39]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'INFO' ? (
            <div className="space-y-4">
              {/* User Highlight Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900">{user.name}</h4>
                  <p className="text-xs font-semibold text-slate-500 font-mono mt-0.5">
                    @{user.username}
                  </p>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                    user.role === 'ADMIN'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {user.role === 'ADMIN' ? 'Toàn quyền Admin' : 'Nhân viên thu ngân'}
                </div>
              </div>

              {/* Detail Items */}
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>Email liên kết</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {user.email || 'Chưa thiết lập'}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Lần đăng nhập gần nhất</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {formatDate(user.last_login_at)}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Ngày tạo tài khoản</span>
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {formatDate(user.created_at)}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-500 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Trạng thái tài khoản</span>
                  </div>
                  <span className="font-bold text-emerald-700 text-xs sm:text-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Đang hoạt động
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {pwError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{pwError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mật khẩu mới
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full mt-2 py-3 bg-[#1B6C39] hover:bg-[#15592e] text-white font-bold rounded-xl shadow transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pwLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Lưu mật khẩu mới</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-rose-700 hover:bg-rose-50 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all border border-rose-200 hover:border-rose-300"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs sm:text-sm transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
