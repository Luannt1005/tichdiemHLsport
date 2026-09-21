'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  UserPlus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react';
import { authStore } from '@/lib/auth/auth-store';
import { activityLogService } from '@/lib/services/activity-log-service';
import { UserRole } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

// Badminton Shuttlecock SVG Icon
function ShuttlecockIcon({ className = 'w-8 h-8' }: { className?: string }) {
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
      <path d="M9.5 17.5a2.5 2.5 0 0 0 5 0l-.5-2.5h-4l-.5 2.5z" fill="currentColor" />
      <path d="M7 12h10" />
      <path d="M5.5 8h13" />
      <path d="M4 4l4 11" />
      <path d="M20 4l-4 11" />
      <path d="M9 4.5l1 10.5" />
      <path d="M15 4.5l-1 10.5" />
      <path d="M12 4v11" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { success } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [showPassword, setShowPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /customers
  useEffect(() => {
    if (authStore.isAuthenticated()) {
      router.replace('/customers');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim() || !username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu và xác nhận mật khẩu không khớp nhau');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const res = await authStore.register({
        username,
        name,
        email: email || undefined,
        password,
        role,
      });

      if (res.success && res.user) {
        await activityLogService.logActivity(
          'USER_REGISTER',
          'AUTH',
          res.user.id,
          `Tạo tài khoản mới: ${res.user.name} (@${res.user.username}) với vai trò ${res.user.role}`,
          { role: res.user.role, username: res.user.username, name: res.user.name }
        );

        success(
          'Tạo tài khoản thành công',
          `Chào mừng ${res.user.name}! Đã tự động đăng nhập vào hệ thống.`
        );
        router.push('/customers');
      } else {
        setErrorMsg(res.error || 'Không thể tạo tài khoản');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-900">
      {/* Dynamic Badminton Court Background */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 20%, #207D43 0%, #134F29 60%, #0B2B16 100%)',
        }}
      />

      {/* Decorative Court Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full border-8 border-white/40 max-w-4xl max-h-[85vh] m-auto rounded-3xl grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-white/30" />
          <div />
        </div>
      </div>

      {/* Main Register Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#207D43] to-[#134F29] text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 mb-3 ring-4 ring-emerald-50">
            <ShuttlecockIcon className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Tạo Tài Khoản Mới
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Đăng ký tài khoản nhân viên / quản trị viên HL Badminton
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Họ và tên *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Cường"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Tên đăng nhập *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="font-mono text-xs font-bold text-slate-400">@</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="viết liền không dấu (vd: cuongnguyen)"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Email liên kết (tùy chọn)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cuong@hlsport.vn"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mật khẩu *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Xác nhận lại *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Vai trò phân quyền *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('STAFF')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  role === 'STAFF'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="text-xs font-bold">Thu Ngân</div>
                    <div className="text-[10px] text-slate-500">Tích & đổi điểm</div>
                  </div>
                </div>
                {role === 'STAFF' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  role === 'ADMIN'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-xs font-bold">Quản Trị</div>
                    <div className="text-[10px] text-slate-500">Toàn quyền hệ thống</div>
                  </div>
                </div>
                {role === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 py-3 px-4 bg-gradient-to-r from-[#207D43] to-[#134F29] hover:from-[#1b6b3a] hover:to-[#0f3e20] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản & Đăng nhập ngay</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs font-bold">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-[#1B6C39]" />
            <span>Đã có tài khoản?</span>
            <span className="text-[#1B6C39] underline decoration-emerald-400 decoration-2 underline-offset-2">
              Đăng nhập tại đây
            </span>
          </Link>

          <Link
            href="/lookup"
            className="inline-flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors pt-1"
          >
            <span>Khách chơi sân?</span>
            <span className="underline decoration-slate-400 underline-offset-2">
              Tra cứu điểm hội viên
            </span>
          </Link>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center text-xs text-slate-400 font-medium">
          Hệ thống Quản lý Sân Cầu Lông HL Sport • v1.0
        </div>
      </div>
    </div>
  );
}
