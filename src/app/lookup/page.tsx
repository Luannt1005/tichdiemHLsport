'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Phone,
  Sparkles,
  Calendar,
  Clock,
  Award,
  ArrowRight,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Gift,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  LogIn,
} from 'lucide-react';
import { Customer, PointLot, PointTransaction } from '@/types/database';

// Custom Badminton Shuttlecock Icon
function ShuttlecockIcon({ className = 'w-6 h-6' }: { className?: string }) {
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

interface LookupData {
  customer: Customer;
  lots: PointLot[];
  transactions: PointTransaction[];
  settings: {
    amount_per_point: number;
    points_per_amount: number;
    expiry_days: number;
  };
  cash_value: number;
}

export default function CustomerLookupPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<LookupData | null>(null);
  const [activeTab, setActiveTab] = useState<'LOTS' | 'HISTORY' | 'POLICY'>('LOTS');

  // Format phone as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    setPhoneInput(val);
    if (errorMsg) setErrorMsg('');
  };

  const handleSearch = async (overridePhone?: string) => {
    const targetPhone = (overridePhone || phoneInput).trim();
    if (!targetPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại của bạn');
      return;
    }

    if (targetPhone.length < 9 || targetPhone.length > 11) {
      setErrorMsg('Số điện thoại không hợp lệ (từ 9 đến 11 số)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/lookup?phone=${encodeURIComponent(targetPhone)}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setData(json);
      } else {
        setData(null);
        setErrorMsg(
          json.message ||
            'Không tìm thấy thông tin khách hàng với số điện thoại này. Bạn có thể liên hệ thu ngân sân để đăng ký thành viên!'
        );
      }
    } catch (err: any) {
      setData(null);
      setErrorMsg('Không thể kết nối máy chủ để tra cứu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (_) {
      return isoStr;
    }
  };

  const formatDateTime = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return {
        date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch (_) {
      return { date: isoStr, time: '' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Background Gradient & Court Lines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          background: 'radial-gradient(circle at 50% 10%, #207D43 0%, #134F29 50%, #06180c 100%)',
        }}
      />

      {/* Navigation Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-900/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/lookup" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#207D43] to-[#134F29] text-white flex items-center justify-center shadow-lg shadow-emerald-950/50">
              <ShuttlecockIcon className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-base sm:text-lg text-white tracking-tight">
                HL Badminton Sport
              </span>
              <p className="text-[11px] text-emerald-400 font-semibold leading-tight">
                Cổng Tra Cứu Điểm Hội Viên
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nhân viên sân</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tra cứu trực tuyến không cần đăng nhập</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Kiểm Tra Điểm & Hạn Dùng
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Nhập số điện thoại đăng ký khi đặt sân để xem số điểm tích lũy, các gói điểm sắp hết hạn và lịch sử giao dịch.
          </p>
        </div>

        {/* Search Box Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-5 h-5 text-emerald-400" />
              </div>
              <input
                type="tel"
                value={phoneInput}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                placeholder="Nhập số điện thoại (ví dụ: 0901234567)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-800/80 border border-white/15 rounded-2xl text-white font-bold text-base sm:text-lg tracking-wide placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#207D43] focus:border-transparent transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-3.5 bg-gradient-to-r from-[#207D43] to-[#134F29] hover:from-[#1b6b3a] hover:to-[#0f3e20] text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Tra cứu điểm</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Suggestions / Sample Numbers */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-semibold">Gợi ý thử nhanh:</span>
            {['0901234567', '0912345678', '0945678901'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setPhoneInput(num);
                  handleSearch(num);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-emerald-300 transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <div className="space-y-1">
                <p className="font-bold">{errorMsg}</p>
                <p className="text-xs text-rose-300/80">
                  Nếu bạn vừa chơi sân lần đầu, hãy yêu cầu thu ngân tích điểm vào số điện thoại của bạn sau trận đấu nhé!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {data && (
          <div className="space-y-6 animate-fade-in">
            {/* Digital Membership Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#207D43] via-[#1B6C39] to-[#0d3f1e] p-6 sm:p-8 text-white shadow-2xl border border-emerald-500/30">
              {/* Card decorative court lines */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none">
                <div className="w-full h-full border-2 border-white rounded-l-3xl" />
              </div>

              <div className="relative z-10 flex flex-col justify-between min-h-[180px]">
                {/* Card Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                      <ShuttlecockIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
                        HỘI VIÊN CHÍNH THỨC
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        {data.customer.name}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-xs font-bold text-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hoạt động</span>
                  </div>
                </div>

                {/* Card Middle: Points display */}
                <div className="my-6">
                  <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                    Điểm khả dụng hiện tại
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-sm">
                      {data.customer.total_points.toLocaleString('vi-VN')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-200">
                      điểm
                    </span>
                  </div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-black/20 px-2.5 py-1 rounded-lg">
                    <Gift className="w-3.5 h-3.5" />
                    <span>
                      Quy đổi tương đương:{' '}
                      <strong className="text-white font-black">
                        {data.cash_value.toLocaleString('vi-VN')} VNĐ
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Card Bottom: Phone & Stats */}
                <div className="pt-4 border-t border-white/15 flex flex-wrap items-center justify-between text-xs text-emerald-100 gap-3">
                  <div className="font-mono font-bold tracking-wider">
                    SĐT: {data.customer.phone}
                  </div>
                  <div className="flex items-center gap-4">
                    <span>
                      Tích lũy trọn đời:{' '}
                      <strong>
                        {data.customer.lifetime_points_earned?.toLocaleString('vi-VN') || 0}
                      </strong>
                    </span>
                    <span>
                      Đã sử dụng:{' '}
                      <strong>
                        {data.customer.lifetime_points_used?.toLocaleString('vi-VN') || 0}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiring Soon Alert Banner */}
            {(data.customer.expiring_soon_points || 0) > 0 && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-3.5 text-amber-200">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm">
                  <p className="font-black text-amber-300">
                    Bạn có{' '}
                    <span className="text-white font-black underline">
                      {data.customer.expiring_soon_points?.toLocaleString('vi-VN')} điểm
                    </span>{' '}
                    sắp hết hạn trong 30 ngày tới!
                  </p>
                  <p className="text-amber-200/80">
                    Hãy sử dụng điểm để đổi nước uống, thuê sân hoặc giảm giá hóa đơn trong lần chơi sân tiếp theo nhé.
                  </p>
                </div>
              </div>
            )}

            {/* Details Tabs Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
              {/* Tab Bar */}
              <div className="flex border-b border-white/10 px-4 sm:px-6 pt-3 bg-black/20 gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('LOTS')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'LOTS'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Chi tiết lô điểm & Hạn dùng ({data.lots.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'HISTORY'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Lịch sử tích / đổi điểm</span>
                </button>
                <button
                  onClick={() => setActiveTab('POLICY')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'POLICY'
                      ? 'border-emerald-400 text-emerald-300'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Quy tắc đổi điểm</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6">
                {/* TAB 1: POINT LOTS */}
                {activeTab === 'LOTS' && (
                  <div className="space-y-3">
                    {data.lots.length === 0 ? (
                      <p className="text-center py-8 text-sm text-slate-400">
                        Hiện tại bạn không có lô điểm nào còn hiệu lực.
                      </p>
                    ) : (
                      data.lots.map((lot) => {
                        const daysLeft = lot.days_left ?? 0;
                        const isUrgent = daysLeft <= 30;

                        return (
                          <div
                            key={lot.id}
                            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-white">
                                  {lot.remaining_points.toLocaleString('vi-VN')} điểm
                                </span>
                                <span className="text-xs text-slate-400">
                                  (ban đầu {lot.original_points.toLocaleString('vi-VN')} điểm)
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>Tích ngày: {formatDate(lot.earned_at)}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                              <div className="text-right">
                                <span className="text-[11px] text-slate-400 block">
                                  Hạn dùng đến
                                </span>
                                <span className="text-xs font-bold text-slate-200">
                                  {formatDate(lot.expires_at)}
                                </span>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-xl text-xs font-black tracking-wide ${
                                  isUrgent
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Hôm nay hết hạn'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 2: TRANSACTIONS HISTORY */}
                {activeTab === 'HISTORY' && (
                  <div className="space-y-2.5">
                    {data.transactions.length === 0 ? (
                      <p className="text-center py-8 text-sm text-slate-400">
                        Chưa có lịch sử giao dịch nào được ghi nhận.
                      </p>
                    ) : (
                      data.transactions.map((tx) => {
                        const isPositive = tx.points > 0;
                        const dateObj = formatDateTime(tx.created_at);

                        return (
                          <div
                            key={tx.id}
                            className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs sm:text-sm font-bold text-white">
                                {tx.description ||
                                  (tx.type === 'EARN'
                                    ? 'Tích điểm thanh toán tiền sân'
                                    : 'Đổi điểm ưu đãi')}
                              </p>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                                <span>{dateObj.time}</span>
                                <span>•</span>
                                <span>{dateObj.date}</span>
                                {tx.reference_id && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-emerald-400/80">
                                      {tx.reference_id}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`font-black text-sm sm:text-base ${
                                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isPositive ? `+${tx.points.toLocaleString('vi-VN')}` : tx.points.toLocaleString('vi-VN')}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-semibold">
                                {tx.type === 'EARN'
                                  ? 'Cộng điểm'
                                  : tx.type === 'REDEEM'
                                  ? 'Trừ điểm'
                                  : 'Biến động'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 3: POLICY */}
                {activeTab === 'POLICY' && (
                  <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                      <h4 className="font-bold text-emerald-300 flex items-center gap-2 text-sm">
                        <Award className="w-4 h-4" />
                        <span>Chính Sách Tích & Đổi Điểm Tại HL Sport</span>
                      </h4>
                      <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                        <li>
                          <strong>Tỷ lệ tích điểm:</strong> Mỗi{' '}
                          <span className="text-white font-bold">
                            {data.settings.amount_per_point.toLocaleString('vi-VN')}đ
                          </span>{' '}
                          thanh toán tiền sân được cộng{' '}
                          <span className="text-emerald-400 font-bold">
                            {data.settings.points_per_amount} điểm
                          </span>.
                        </li>
                        <li>
                          <strong>Thời hạn sử dụng:</strong> Điểm có giá trị trong vòng{' '}
                          <span className="text-white font-bold">
                            {data.settings.expiry_days} ngày
                          </span>{' '}
                          kể từ ngày tích.
                        </li>
                        <li>
                          <strong>Quy tắc trừ điểm FEFO:</strong> Khi đổi điểm, hệ thống luôn tự động trừ điểm ở các lô sắp hết hạn trước nhất để bảo toàn tối đa quyền lợi cho bạn.
                        </li>
                        <li>
                          <strong>Cách đổi ưu đãi:</strong> Báo với thu ngân số điện thoại và số điểm muốn sử dụng khi thanh toán tiền sân hoặc mua phụ kiện, nước uống tại sân.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-900/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-400">HL Badminton Sport • Hệ Thống Sân Cầu Lông Tiêu Chuẩn</p>
          <p>Mọi thắc mắc về điểm thưởng, vui lòng liên hệ quầy thu ngân tại sân để được hỗ trợ trực tiếp.</p>
        </div>
      </footer>
    </div>
  );
}
