'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { authStore, PRESET_USERS } from '@/lib/auth/auth-store';
import { activityLogService } from '@/lib/services/activity-log-service';
import { useToast } from '@/components/ui/Toast';

// Badminton Shuttlecock SVG Icon
function ShuttlecockIcon({ className = 'w-7 h-7' }: { className?: string }) {
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

export default function LoginPage() {
  const router = useRouter();
  const { success } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    setLoading(true);
    try {
      const res = await authStore.login(username, password);
      if (res.success && res.user) {
        await activityLogService.logActivity(
          'LOGIN',
          'AUTH',
          res.user.id,
          `Đăng nhập thành công với tài khoản ${res.user.name} (${res.user.role === 'ADMIN' ? 'Quản trị viên' : 'Thu ngân'})`,
          { role: res.user.role, username: res.user.username }
        );

        success('Đăng nhập thành công', `Chào mừng ${res.user.name} trở lại hệ thống!`);
        router.push('/customers');
      } else {
        setErrorMsg(res.error || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'ADMIN' | 'STAFF') => {
    const target = PRESET_USERS.find((u) => u.role === type);
    if (!target) return;

    setUsername(target.username);
    setPassword(target.password_hash);
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await authStore.login(target.username, target.password_hash);
      if (res.success && res.user) {
        await activityLogService.logActivity(
          'LOGIN',
          'AUTH',
          res.user.id,
          `Đăng nhập nhanh thành công với vai trò ${res.user.role === 'ADMIN' ? 'Quản trị viên' : 'Thu ngân'} (${res.user.name})`,
          { role: res.user.role, username: res.user.username, type: 'QUICK_LOGIN' }
        );

        success('Đăng nhập thành công', `Đã đăng nhập với tư cách ${res.user.name}`);
        router.push('/customers');
      } else {
        setErrorMsg(res.error || 'Lỗi đăng nhập nhanh');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-800">
      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1B6C39] text-white flex items-center justify-center shadow-sm mb-3">
            <ShuttlecockIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Đăng Nhập Hệ Thống
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý tích điểm sân cầu lông HL Sport
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên đăng nhập
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-emerald-700" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4 text-emerald-700" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1B6C39] hover:bg-[#14532b] text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Login Section */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Đăng nhập nhanh một chạm:</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('ADMIN')}
              disabled={loading}
              className="p-2.5 border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900">Quản trị viên</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-mono">admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('STAFF')}
              disabled={loading}
              className="p-2.5 border border-blue-200 bg-blue-50/60 hover:bg-blue-100/60 rounded-xl text-left transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <UserCheck className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-bold text-blue-900">Thu ngân</span>
              </div>
              <span className="text-[11px] text-blue-700 font-mono">nhanvien</span>
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="pt-2 flex flex-col gap-2 text-center text-xs font-semibold">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-1.5 p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#1B6C39]" />
            <span>Chưa có tài khoản?</span>
            <span className="text-[#1B6C39] font-bold underline decoration-emerald-400">
              Tạo tài khoản mới
            </span>
          </Link>

          <Link
            href="/lookup"
            className="inline-flex items-center justify-center gap-1 text-slate-500 hover:text-slate-800 transition-colors pt-1"
          >
            <span>Khách chơi sân?</span>
            <span className="underline">Tra cứu điểm thưởng tại đây</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
