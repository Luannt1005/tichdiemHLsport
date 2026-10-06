'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  ShieldCheck,
  UserPlus,
  Mail,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { authStore } from '@/lib/auth/auth-store';
import { useToast } from '@/components/ui/Toast';
import { BrandLogo } from '@/components/ui/BrandLogo';

export default function RegisterPage() {
  const router = useRouter();
  const { success } = useToast();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
      });

      if (res.success) {
        success(
          'Đăng ký thành công',
          'Tài khoản đang chờ Quản trị viên duyệt. Bạn có thể đăng nhập sau khi được kích hoạt.'
        );
        router.push('/login');
      } else {
        setErrorMsg(res.error || 'Không thể tạo tài khoản');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-slate-50 text-slate-800">
      {/* Main Register Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#1B6C39] p-2.5 flex items-center justify-center shadow-sm mb-3">
            <BrandLogo className="w-full h-full" variant="white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Tạo Tài Khoản Mới
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký tài khoản làm việc tại HL Badminton Sport
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-emerald-700" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn Cường"
                required
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên đăng nhập <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="font-mono text-xs font-bold text-emerald-700">@</span>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="viết liền không dấu (vd: cuongnguyen)"
                required
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email (tùy chọn)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4 text-emerald-700" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cuong@hlsport.vn"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Xác nhận lại <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-800 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
            <span>
              Tài khoản mới có vai trò <strong>Thu ngân</strong> và cần <strong>Quản trị viên duyệt</strong> trước khi
              đăng nhập được.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-[#1B6C39] hover:bg-[#14532b] text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản & Đăng nhập ngay</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="pt-2 flex flex-col gap-2 text-center text-xs font-semibold">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-[#1B6C39]" />
            <span>Đã có tài khoản?</span>
            <span className="text-[#1B6C39] font-bold underline decoration-emerald-400">
              Đăng nhập tại đây
            </span>
          </Link>

          <Link
            href="/lookup"
            className="inline-flex items-center justify-center gap-1 text-slate-500 hover:text-slate-800 transition-colors pt-1"
          >
            <span>Khách chơi sân?</span>
            <span className="underline">Tra cứu điểm thưởng</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
