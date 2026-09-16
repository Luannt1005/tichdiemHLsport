'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MinusCircle, Coins, AlertCircle, ArrowRight, Check, X, ShieldAlert, Sparkles, Info } from 'lucide-react';
import { loyaltyStore, DEFAULT_SETTING } from '@/lib/store/loyalty-store';
import { formatVND, formatDateOnly } from '@/lib/points-engine';
import { PointSetting, Customer, PointLot } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

interface RedeemPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCustomer?: Customer | null;
  initialPhone?: string;
}

export function RedeemPointsModal({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
  initialPhone = '',
}: RedeemPointsModalProps) {
  const { success, error } = useToast();
  const [mounted, setMounted] = useState(false);

  const [phone, setPhone] = useState(initialPhone || initialCustomer?.phone || '');
  const [customer, setCustomer] = useState<Customer | null>(initialCustomer || null);
  const [lots, setLots] = useState<PointLot[]>([]);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(50);
  const [description, setDescription] = useState('Khấu trừ thanh toán tiền sân');
  const [referenceType, setReferenceType] = useState('BOOKING');
  const [referenceId, setReferenceId] = useState('');
  const [setting, setSetting] = useState<PointSetting>(DEFAULT_SETTING);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loyaltyStore.getPointSettings().then(setSetting);
      setShowConfirm(false);

      if (initialCustomer) {
        setCustomer(initialCustomer);
        setPhone(initialCustomer.phone);
        loyaltyStore.getCustomerLots(initialCustomer.id).then(setLots);
      } else if (initialPhone) {
        setPhone(initialPhone);
      }
    }
  }, [isOpen, initialCustomer, initialPhone]);

  // Lookup customer by phone if not pre-provided
  useEffect(() => {
    if (initialCustomer) return;

    if (phone.trim().length >= 9) {
      loyaltyStore.getCustomerByPhone(phone).then((cust) => {
        if (cust) {
          setCustomer(cust);
          loyaltyStore.getCustomerLots(cust.id).then(setLots);
        } else {
          setCustomer(null);
          setLots([]);
        }
      });
    } else {
      setCustomer(null);
      setLots([]);
    }
  }, [phone, initialCustomer]);

  if (!isOpen || !mounted) return null;

  const currentBalance = customer?.total_points || 0;
  const activeLots = lots.filter((l) => l.status === 'ACTIVE' && l.remaining_points > 0);

  // Estimate FEFO allocation preview
  const previewAllocations: { lot: PointLot; deduct: number }[] = [];
  let remainingNeed = pointsToRedeem;
  for (const lot of activeLots) {
    if (remainingNeed <= 0) break;
    const deduct = Math.min(lot.remaining_points, remainingNeed);
    previewAllocations.push({ lot, deduct });
    remainingNeed -= deduct;
  }

  const handleQuickPercent = (percent: number) => {
    if (!customer) return;
    const pts = Math.floor((currentBalance * percent) / 100);
    setPointsToRedeem(Math.max(1, pts));
  };

  const handleConfirmRedeem = async () => {
    if (!customer) return;
    if (pointsToRedeem <= 0 || pointsToRedeem > currentBalance) {
      error('Số điểm không hợp lệ', 'Số điểm trừ phải lớn hơn 0 và không vượt quá số dư hiện có');
      return;
    }

    setLoading(true);
    try {
      const res = await loyaltyStore.redeemPoints({
        customerId: customer.id,
        points: pointsToRedeem,
        description,
        referenceType,
        referenceId: referenceId || undefined,
      });

      success(
        'Trừ điểm thành công!',
        `Đã trừ ${pointsToRedeem} điểm của ${customer.name}. Số dư mới: ${res.newBalance} điểm.`
      );

      if (onSuccess) onSuccess();
      setShowConfirm(false);
      onClose();
    } catch (err: any) {
      error('Lỗi trừ điểm', err.message || 'Không thể thực hiện trừ điểm');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden my-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-amber-50">
          <h3 className="text-base font-bold text-slate-900">Sử Dụng / Trừ Điểm Khách Hàng</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Customer Info / Lookup */}
          {customer ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50/70 to-amber-50/70 border border-rose-200/70">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                    {customer.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{customer.name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{customer.phone}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số dư khả dụng</div>
                  <div className="text-base font-black text-rose-600">{currentBalance} điểm</div>
                </div>
              </div>
              {!initialCustomer && (
                <div className="mt-2.5 pt-2.5 border-t border-rose-100 flex justify-end text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setPhone('');
                    }}
                    className="text-rose-600 hover:underline font-semibold"
                  >
                    Đổi khách khác
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Số điện thoại khách hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại khách cần trừ điểm..."
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
              />
            </div>
          )}

          {customer && currentBalance <= 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Khách hàng này hiện có <strong>0 điểm</strong>, không thể thực hiện giao dịch trừ điểm.</span>
            </div>
          ) : customer ? (
            <>
              {/* Points input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Số điểm muốn sử dụng <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={currentBalance}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Math.min(currentBalance, Math.max(0, Number(e.target.value))))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-lg font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    / {currentBalance} điểm
                  </span>
                </div>
              </div>

              {/* FEFO Allocation Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                  <span>Phân bổ trừ theo lô điểm (FEFO):</span>
                  <span className="text-rose-600 font-black">-{pointsToRedeem} điểm</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {previewAllocations.map(({ lot, deduct }) => (
                    <div
                      key={lot.id}
                      className="flex items-center justify-between text-[11px] bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-slate-700">Lô {lot.id.slice(0, 8)}</span>
                        <span className="text-slate-400 ml-1.5">
                          (hết hạn {formatDateOnly(lot.expires_at)})
                        </span>
                      </div>
                      <span className="font-bold text-rose-600">-{deduct} đ</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Số dư còn lại sau khi trừ:</span>
                  <span className="font-bold text-slate-900">{currentBalance - pointsToRedeem} điểm</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nội dung sử dụng điểm
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="VD: Trừ tiền sân giờ vàng..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>

              {/* Confirmation Alert */}
              {showConfirm && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Xác nhận trừ điểm khách hàng</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Bạn có chắc chắn muốn trừ <strong>{pointsToRedeem} điểm</strong> của khách hàng <strong>{customer.name}</strong>? Thao tác này sẽ ghi nhận vào sổ cái giao dịch và không thể hoàn tác trực tiếp.
                  </p>
                </div>
              )}
            </>
          ) : null}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy bỏ
            </button>

            {customer && currentBalance > 0 && (
              <>
                {!showConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirm(true)}
                    disabled={pointsToRedeem <= 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Tiếp tục trừ điểm</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmRedeem}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    {loading ? (
                      <span>Đang trừ điểm...</span>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Xác nhận trừ {pointsToRedeem} điểm</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
