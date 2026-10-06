'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Phone,
  Clock,
  TrendingUp,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  Coins,
} from 'lucide-react';
import { formatDateOnly, formatDateTime, formatVND } from '@/lib/points-engine';
import { TRANSACTION_TYPE_STYLES, formatPointsDelta, pointsTextClass } from '@/lib/transaction-display';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { PublicLookupResult } from '@/types/database';

export default function CustomerLookupPage() {
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<PublicLookupResult | null>(null);
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'LOTS' | 'POLICY'>('HISTORY');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    setPhoneInput(val);
    if (errorMsg) setErrorMsg('');
  };

  const handleSearch = async (overridePhone?: string) => {
    const targetPhone = (overridePhone || phoneInput).trim();
    if (!targetPhone) {
      setErrorMsg('Vui lòng nhập số điện thoại');
      return;
    }

    if (targetPhone.length < 9 || targetPhone.length > 11) {
      setErrorMsg('Số điện thoại không đúng định dạng');
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
            'Không tìm thấy số điện thoại này trên hệ thống. Vui lòng liên hệ thu ngân tại sân để kiểm tra!'
        );
      }
    } catch {
      setData(null);
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/lookup" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#1B6C39] p-2 flex items-center justify-center shadow-sm">
              <BrandLogo className="w-full h-full" variant="white" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                HL Badminton Sport
              </span>
              <p className="text-xs text-[#1B6C39] font-medium">
                Tra cứu điểm tích lũy
              </p>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Search Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="text-center sm:text-left">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Kiểm tra điểm thưởng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Nhập số điện thoại của bạn để xem điểm và hạn dùng
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <input
                type="tel"
                value={phoneInput}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                placeholder="Nhập số điện thoại (ví dụ: 0901234567)"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1B6C39] focus:bg-white transition-all"
              />
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-6 py-3 bg-[#1B6C39] hover:bg-[#14532b] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 shadow-xs cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra cứu</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <p className="font-medium">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {data && (
          <div className="space-y-4">
            {/* Membership Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1B6C39] to-[#124b27] p-5 sm:p-6 text-white shadow-md">
              <div className="relative z-10 flex flex-col justify-between space-y-5">
                {/* Card Header: Name & Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200 block">
                      Khách hàng thân thiết
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                      {data.customer.name}
                    </h2>
                    <p className="text-xs text-emerald-100 font-medium mt-0.5">
                      SĐT: {data.customer.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Đang hoạt động</span>
                  </div>
                </div>

                {/* Card Middle: Available Points */}
                <div className="bg-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-xs">
                  <div>
                    <span className="text-xs font-semibold text-emerald-100 block">
                      Số điểm hiện có
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {data.customer.total_points.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-sm font-semibold text-emerald-200">
                        điểm
                      </span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-black/30 px-3.5 py-2 rounded-xl self-start sm:self-center border border-amber-300/30 shadow-xs">
                    <Coins className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>
                      Quy đổi tiền mặt:{' '}
                      <strong className="text-white text-sm">
                        {formatVND(data.cash_value)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Card Footer: Summary Stats */}
                <div className="pt-3 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-100">
                  <div className="bg-black/20 p-2.5 rounded-xl flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-[11px] text-emerald-200 font-medium">Số tiền đã thanh toán:</span>
                    <strong className="text-white text-sm sm:text-base font-bold">
                      {formatVND(data.total_amount_paid)}
                    </strong>
                  </div>
                  <div className="bg-black/20 p-2.5 rounded-xl flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-[11px] text-emerald-200 font-medium">Tổng điểm đã dùng:</span>
                    <strong className="text-white text-sm sm:text-base font-bold">
                      {(data.customer.lifetime_points_used || 0).toLocaleString('vi-VN')} điểm
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiring Points Alert */}
            {(data.customer.expiring_soon_points || 0) > 0 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800 text-xs sm:text-sm">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <p>
                  Bạn có{' '}
                  <strong className="text-amber-900 font-bold">
                    {data.customer.expiring_soon_points?.toLocaleString('vi-VN')} điểm
                  </strong>{' '}
                  sắp hết hạn trong 30 ngày tới. Bạn có thể dùng khi thanh toán tiền sân nhé!
                </p>
              </div>
            )}

            {/* Detail Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 px-4 pt-2 bg-slate-50 gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'HISTORY'
                      ? 'border-[#1B6C39] text-[#1B6C39]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Lịch sử điểm</span>
                </button>

                <button
                  onClick={() => setActiveTab('LOTS')}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'LOTS'
                      ? 'border-[#1B6C39] text-[#1B6C39]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Hạn dùng điểm ({data.lots.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('POLICY')}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'POLICY'
                      ? 'border-[#1B6C39] text-[#1B6C39]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Cách dùng điểm</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-5">
                {/* TAB 1: HISTORY */}
                {activeTab === 'HISTORY' && (
                  <div className="space-y-2">
                    {data.transactions.length === 0 ? (
                      <p className="text-center py-6 text-xs sm:text-sm text-slate-400">
                        Chưa có lịch sử giao dịch.
                      </p>
                    ) : (
                      data.transactions.map((tx) => {
                        return (
                          <div
                            key={tx.id}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                                {tx.description ||
                                  (tx.type === 'EARN'
                                    ? 'Cộng điểm đặt sân'
                                    : 'Dùng điểm giảm giá')}
                              </p>
                              <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                                <span>{formatDateTime(tx.created_at)}</span>
                                {tx.amount > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-slate-600">
                                      Thanh toán: {formatVND(tx.amount)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`font-extrabold text-sm sm:text-base ${pointsTextClass(tx)}`}
                              >
                                {formatPointsDelta(tx.points)}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {TRANSACTION_TYPE_STYLES[tx.type].label}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* TAB 2: LOTS */}
                {activeTab === 'LOTS' && (
                  <div className="space-y-2.5">
                    {data.lots.length === 0 ? (
                      <p className="text-center py-6 text-xs sm:text-sm text-slate-400">
                        Không có điểm nào còn hạn dùng.
                      </p>
                    ) : (
                      data.lots.map((lot) => {
                        const daysLeft = lot.days_left ?? 0;
                        const isUrgent = daysLeft <= 30;

                        return (
                          <div
                            key={lot.id}
                            className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-base text-slate-900">
                                  {lot.remaining_points.toLocaleString('vi-VN')} điểm
                                </span>
                                <span className="text-xs text-slate-400">
                                  (tích ban đầu: {lot.original_points.toLocaleString('vi-VN')})
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Tích ngày: {formatDateOnly(lot.earned_at)}
                              </p>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                              <div className="text-right">
                                <span className="text-[11px] text-slate-400 block">Hạn đến</span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatDateOnly(lot.expires_at)}
                                </span>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                                  isUrgent
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Hết hạn hôm nay'}
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
                  <div className="space-y-3 text-xs sm:text-sm text-slate-600">
                    <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2.5">
                      <p className="font-bold text-emerald-900 text-sm">
                        Quy định tích & dùng điểm:
                      </p>
                      <ul className="space-y-2 list-disc list-inside text-slate-700">
                        <li>
                          <strong>Tích điểm:</strong> Mỗi{' '}
                          <span className="font-bold text-slate-900">
                            {formatVND(data.settings.amount_per_point)}
                          </span>{' '}
                          tiền sân được cộng{' '}
                          <span className="font-bold text-emerald-700">
                            {data.settings.points_per_amount} điểm
                          </span> (làm tròn xuống).
                        </li>
                        <li>
                          <strong>Quy đổi tiền mặt:</strong> Mỗi{' '}
                          <span className="font-bold text-amber-700">1 điểm thưởng</span> có giá trị tương đương{' '}
                          <span className="font-bold text-slate-900">
                            {formatVND(data.settings.cash_per_point)}
                          </span>{' '}
                          tiền mặt khi dùng để trừ vào tiền sân khi thanh toán.
                        </li>
                        <li>
                          <strong>Thời hạn:</strong> Điểm có hạn dùng trong{' '}
                          <span className="font-bold text-slate-900">
                            {data.settings.expiry_days} ngày
                          </span>. Điểm sắp hết hạn sẽ được ưu tiên trừ trước.
                        </li>
                        <li>
                          <strong>Sử dụng điểm:</strong> Báo số điện thoại cho thu ngân khi thanh toán để trừ tiền trực tiếp vào hóa đơn.
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
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>HL Badminton Sport • Hệ Thống Sân Cầu Lông Tiêu Chuẩn</p>
      </footer>
    </div>
  );
}
