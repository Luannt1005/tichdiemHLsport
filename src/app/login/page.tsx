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
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  Mail,
  CheckCircle2,
} from 'lucide-react';
import { authStore, PRESET_USERS } from '@/lib/auth/auth-store';
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

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('STAFF');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to /customers
  useEffect(() => {
    if (authStore.isAuthenticated()) {
      router.replace('/customers');
    }
  }, [router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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
          `Đăng nhập thành công với tài khoản ${res.user.name} (${res.user.role})`,
          { role: res.user.role, username: res.user.username }
        );

        success('Đăng nhập thành công', `Chào mừng ${res.user.name} trở lại hệ thống!`);
        router.push('/customers');
      } else {
        setErrorMsg(res.error || 'Đăng nhập không thành công');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regName.trim() || !regUsername.trim() || !regPassword.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Mật khẩu và xác nhận mật khẩu không khớp nhau');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const res = await authStore.register({
        username: regUsername,
        name: regName,
        email: regEmail || undefined,
        password: regPassword,
        role: regRole,
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
          `Đăng nhập nhanh thành công với vai trò ${res.user.role} (${res.user.name})`,
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-900">
      {/* Dynamic Badminton Court Background */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          background: 'radial-gradient(circle at 50% 20%, #207D43 0%, #134F29 60%, #0B2B16 100%)',
        }}
      />

      {/* Decorative Badminton Court Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="w-full h-full border-8 border-white/40 max-w-4xl max-h-[85vh] m-auto rounded-3xl grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-white/30" />
          <div className="border-b border-white/30" />
          <div className="border-r border-white/30" />
          <div />
        </div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 transition-all">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#207D43] to-[#134F29] text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 mb-3 ring-4 ring-emerald-50">
            <ShuttlecockIcon className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            HL Badminton Sport
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Hệ thống Quản lý & Tích điểm Hội viên Sân
          </p>
        </div>

        {/* Mode Switcher Tabs (Đăng nhập / Đăng ký) */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'LOGIN'
                ? 'bg-white text-[#1B6C39] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Đăng nhập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'REGISTER'
                ? 'bg-white text-[#1B6C39] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo tài khoản</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs sm:text-sm animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="font-semibold">{errorMsg}</div>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {mode === 'LOGIN' && (
          <>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Tài khoản hoặc Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập 'admin' hoặc 'nhanvien'"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                    className="w-full pl-11 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-[#207D43] to-[#134F29] hover:from-[#1b6b3a] hover:to-[#0f3e20] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng nhập hệ thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Login Section */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs font-bold uppercase tracking-wider justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Đăng nhập nhanh 1-Click</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('ADMIN')}
                  disabled={loading}
                  className="group p-3 border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-xl text-left transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ADMIN
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                      admin
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 line-clamp-1 font-medium">
                    Toàn quyền quản trị
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('STAFF')}
                  disabled={loading}
                  className="group p-3 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 rounded-xl text-left transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-blue-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      THU NGÂN
                    </span>
                    <span className="text-[10px] bg-blue-200/80 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                      nhanvien
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-700/80 line-clamp-1 font-medium">
                    Thu ngân & tích điểm
                  </p>
                </button>
              </div>
            </div>
          </>
        )}

        {/* 2. REGISTER FORM */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
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
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
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
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
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
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
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
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
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
                  onClick={() => setRegRole('STAFF')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    regRole === 'STAFF'
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
                  {regRole === 'STAFF' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => setRegRole('ADMIN')}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                    regRole === 'ADMIN'
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
                  {regRole === 'ADMIN' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
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
        )}

        {/* Customer Lookup Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link
            href="/lookup"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1B6C39] hover:text-[#134F29] transition-colors"
          >
            <span>Bạn là khách chơi sân?</span>
            <span className="underline decoration-emerald-400 decoration-2 underline-offset-2">
              Tra cứu điểm hội viên tại đây
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
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
