'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Calculator, Calendar, X, Sparkles, User, Info } from 'lucide-react';
import { loyaltyStore, DEFAULT_SETTING } from '@/lib/store/loyalty-store';
import { calculatePoints, calculateExpiryDate, formatVND, formatDateOnly, isValidVietnamesePhone } from '@/lib/points-engine';
import { PointSetting, Customer } from '@/types/database';
import { useToast } from '@/components/ui/Toast';
import confetti from 'canvas-confetti';

interface EarnPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomer?: Customer | null;
  initialPhone?: string;
}

export function EarnPointsModal({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
  initialPhone = '',
}: EarnPointsModalProps) {
  const { success, error } = useToast();
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState(initialPhone || initialCustomer?.phone || '');
  const [name, setName] = useState(initialCustomer?.name || '');
  const [amountK, setAmountK] = useState<number | string>(200);
  const [description, setDescription] = useState('Thanh toán tiền thuê sân');
  const [referenceType, setReferenceType] = useState('BOOKING');
  const [referenceId, setReferenceId] = useState('');
  const [setting, setSetting] = useState<PointSetting>(DEFAULT_SETTING);
  const [existingCustomer, setExistingCustomer] = useState<Customer | null>(initialCustomer || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loyaltyStore.getPointSettings().then(setSetting);
      if (initialCustomer) {
        setExistingCustomer(initialCustomer);
        setPhone(initialCustomer.phone);
        setName(initialCustomer.name);
      } else if (initialPhone) {
        setPhone(initialPhone);
      }
    }
  }, [isOpen, initialCustomer, initialPhone]);

  // Lookup customer by phone when phone changes and initialCustomer is not set
  useEffect(() => {
    if (initialCustomer) return;

    if (phone.trim().length >= 9) {
      loyaltyStore.getCustomerByPhone(phone).then((cust) => {
        if (cust) {
          setExistingCustomer(cust);
          setName(cust.name);
        } else {
          setExistingCustomer(null);
          setName('');
        }
      });
    } else {
      setExistingCustomer(null);
      setName('');
    }
  }, [phone, initialCustomer]);

  if (!isOpen || !mounted) return null;

  const activeCustomer = initialCustomer || existingCustomer;

  const numK = typeof amountK === 'string' ? (amountK === '' ? 0 : Number(amountK)) : amountK;
  const amount = numK * 1000;

  const pointsEarned = calculatePoints(
    amount,
    setting.amount_per_point,
    setting.points_per_amount,
    setting.rounding_mode
  );
  const expiryDate = calculateExpiryDate(setting.expiry_days);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhone = activeCustomer ? activeCustomer.phone : phone.trim();

    if (!finalPhone) {
      error('Thiếu thông tin', 'Vui lòng nhập số điện thoại khách hàng');
      return;
    }
    if (!isValidVietnamesePhone(finalPhone)) {
      error('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số)');
      return;
    }
    if (amount <= 0) {
      error('Số tiền không hợp lệ', 'Số tiền thanh toán phải lớn hơn 0đ (VD: nhập 33 là 33.000đ)');
      return;
    }

    setLoading(true);
    try {
      const result = await loyaltyStore.earnPoints({
        phone: finalPhone,
        name: activeCustomer ? activeCustomer.name : name.trim() || undefined,
        amount,
        description,
        referenceType,
        referenceId: referenceId || undefined,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      success(
        'Tích điểm thành công!',
        `Đã cộng +${result.pointsEarned} điểm cho ${result.customer.name}. Số dư mới: ${result.customer.total_points} điểm.`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      error('Lỗi tích điểm', err.message || 'Không thể thực hiện tích điểm');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-auto animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h3 className="text-base font-bold text-slate-900">Cộng Điểm Thanh Toán Tiền Sân</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Case 1: Customer is ALREADY KNOWN / SELECTED -> Show Read-only Customer Profile Card */}
          {activeCustomer ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-200/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                    {activeCustomer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{activeCustomer.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{activeCustomer.phone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm hiện có</div>
                  <div className="text-base font-black text-emerald-700">{activeCustomer.total_points} điểm</div>
                </div>
              </div>
              {!initialCustomer && (
                <div className="mt-2.5 pt-2.5 border-t border-emerald-100/80 flex justify-end text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setExistingCustomer(null);
                      setPhone('');
                      setName('');
                    }}
                    className="text-emerald-700 hover:underline font-semibold"
                  >
                    Đổi khách khác
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Case 2: Customer NOT known yet -> Lookup by Phone */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Số điện thoại khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* If phone entered is new, allow entering initial name */}
              {phone.trim().length >= 9 && !existingCustomer && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Số điện thoại mới - Tạo hồ sơ hội viên lần đầu
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Họ tên khách hàng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Nguyễn Văn An"
                      required
                      className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount Paid with .000 suffix right next to number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Số tiền thanh toán tiền sân <span className="text-rose-500">*</span>
            </label>
            <div
              onClick={() => inputRef.current?.focus()}
              className="flex items-center w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 focus-within:bg-white transition-all cursor-text"
            >
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={amountK}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  setAmountK(clean);
                }}
                placeholder="0"
                required
                style={{
                  width: amountK ? `${String(amountK).length + 0.1}ch` : '1.5ch',
                  minWidth: '1.5ch',
                }}
                className="bg-transparent text-lg font-bold text-emerald-700 focus:outline-none p-0 m-0 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-lg font-bold text-slate-400 select-none pointer-events-none ml-0.5">
                k
              </span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                Tỷ lệ quy đổi:
              </span>
              <span className="font-bold text-slate-900">
                {formatVND(setting.amount_per_point)} = {setting.points_per_amount} điểm ({setting.rounding_mode})
              </span>
            </div>

            <div className="flex items-baseline justify-between pt-2 border-t border-emerald-100">
              <div>
                <span className="text-xs text-slate-500">Điểm nhận được:</span>
                <div className="text-2xl font-black text-emerald-700 flex items-center gap-1">
                  +{pointsEarned}{' '}
                  <span className="text-sm font-bold text-emerald-600">điểm</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Hạn sử dụng:</span>
                <span className="text-xs font-bold text-slate-800 inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  {formatDateOnly(expiryDate.toISOString())} ({setting.expiry_days} ngày)
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ghi chú giao dịch
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thanh toán tiền thuê sân số 2..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || pointsEarned <= 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Xác nhận (+{pointsEarned} điểm)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
