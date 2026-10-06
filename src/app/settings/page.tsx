'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  Calculator,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Gift,
  Coins,
  Plus,
  Trash2,
} from 'lucide-react';
import { loyaltyApi } from '@/lib/api/loyalty-api';
import { useCurrentUser } from '@/lib/auth/auth-store';
import { DEFAULT_SETTING, formatVND } from '@/lib/points-engine';
import { useToast } from '@/components/ui/Toast';
import { PointSetting, UserRole, BonusTier } from '@/types/database';

export default function SettingsPage() {
  const { success, error } = useToast();
  const [setting, setSetting] = useState<PointSetting>(DEFAULT_SETTING);
  const role: UserRole = useCurrentUser()?.role ?? 'STAFF';
  const [loading, setLoading] = useState(false);
  // Bonus tier form state
  const [newTierAmount, setNewTierAmount] = useState<string>('');
  const [newTierPoints, setNewTierPoints] = useState<string>('');
  const [newTierLabel, setNewTierLabel] = useState<string>('');

  useEffect(() => {
    loyaltyApi
      .getSettings()
      .then(setSetting)
      .catch((err) => error('Không tải được cấu hình', err instanceof Error ? err.message : ''));
  }, [error]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      error('Không đủ quyền hạn', 'Chỉ tài khoản ADMIN mới có quyền lưu thay đổi cấu hình tích điểm!');
      return;
    }

    setLoading(true);
    try {
      const saved = await loyaltyApi.updateSettings({
        amount_per_point: setting.amount_per_point,
        points_per_amount: setting.points_per_amount,
        cash_per_point: setting.cash_per_point || 1000,
        expiry_days: setting.expiry_days,
        bonus_tiers: setting.bonus_tiers,
      });
      setSetting(saved);

      success(
        'Lưu cấu hình thành công!',
        `Tỷ lệ: ${formatVND(setting.amount_per_point)} = ${setting.points_per_amount} điểm | 1 điểm = ${formatVND(setting.cash_per_point || 1000)} tiền mặt | Hạn dùng: ${setting.expiry_days} ngày.`
      );
    } catch (err) {
      error('Lỗi lưu cấu hình', err instanceof Error ? err.message : 'Không thể lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Permission Pill */}
      <div className="flex justify-end">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
            role === 'ADMIN'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Vai trò hiện tại: {role}</span>
        </div>
      </div>

      {role !== 'ADMIN' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">Chế độ xem cho Nhân viên (STAFF):</span> Bạn chỉ có thể xem cấu hình. Để lưu thay đổi, vui lòng chuyển sang vai trò <strong>ADMIN</strong> ở thanh Header bên trên.
          </div>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Quy đổi tiền -> Điểm */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Quy Đổi Tiền Sân → Điểm Thưởng</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Số tiền thanh toán mỗi đơn vị điểm (VNĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                step="1000"
                min="1000"
                disabled={role !== 'ADMIN'}
                value={setting.amount_per_point}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  setSetting({ ...setting, amount_per_point: clean === '' ? 0 : Number(clean) });
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value.replace(/\D/g, ''));
                  if (!val || val < 1000) setSetting({ ...setting, amount_per_point: 1000 });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Tương đương: {formatVND(setting.amount_per_point)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Số điểm nhận được tương ứng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                min="1"
                disabled={role !== 'ADMIN'}
                value={setting.points_per_amount}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '');
                  setSetting({ ...setting, points_per_amount: clean === '' ? 0 : Number(clean) });
                }}
                onBlur={(e) => {
                  const val = Number(e.target.value.replace(/\D/g, ''));
                  if (!val || val < 1) setSetting({ ...setting, points_per_amount: 1 });
                }}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mặc định: 1 điểm cho mỗi {formatVND(setting.amount_per_point)}
              </span>
            </div>
          </div>

        </div>

        {/* Section 2: Quy đổi điểm thưởng ra tiền mặt */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Coins className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-slate-900">Quy Đổi Điểm Thưởng → Giá Trị Tiền Mặt</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Giá trị tiền mặt của 1 điểm (VNĐ / Điểm) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="100"
                  step="100"
                  disabled={role !== 'ADMIN'}
                  value={setting.cash_per_point || 1000}
                  onChange={(e) =>
                    setSetting({
                      ...setting,
                      cash_per_point: Math.max(1, Number(e.target.value) || 0),
                    })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all pr-14"
                  placeholder="1000"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  VNĐ
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium pt-2 sm:pt-4">
              Quy tắc tính: Luôn tự động làm tròn xuống (FLOOR). Ví dụ: 100 điểm = {formatVND(100 * (setting.cash_per_point || 1000))} tiền mặt.
            </div>
          </div>
        </div>

        {/* Section 3: Thời gian hết hạn điểm */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">Thời Hạn Sử Dụng Điểm</h3>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Số ngày điểm có hiệu lực <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="7"
                max="730"
                disabled={role !== 'ADMIN'}
                value={setting.expiry_days}
                onChange={(e) =>
                  setSetting({ ...setting, expiry_days: Math.max(7, Number(e.target.value)) })
                }
                className="w-48 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
              <span className="text-xs font-bold text-slate-600">ngày</span>
            </div>
          </div>
        </div>

        {/* Section 4: Mốc Thưởng Điểm */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Điểm Thưởng Theo Mốc Hóa Đơn</h3>
            </div>
            <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Tùy chọn
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Thưởng thêm điểm khi khách đạt mốc hóa đơn nhất định. 
            <strong>Chỉ áp dụng 1 mốc cao nhất phù hợp</strong>, không cộng dồn.
          </p>

          {/* Tiers Table */}
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              <span className="col-span-5">Mốc hóa đơn từ</span>
              <span className="col-span-3">Điểm thưởng</span>
              <span className="col-span-3">Nhãn</span>
              <span className="col-span-1"></span>
            </div>

            {/* Existing tiers */}
            {(setting.bonus_tiers || []).length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs">
                <Gift className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Chưa có mốc thưởng nào. Thêm mốc bên dưới.</p>
              </div>
            )}

            {[...(setting.bonus_tiers || [])]
              .sort((a, b) => a.minAmount - b.minAmount)
              .map((tier) => (
              <div
                key={tier.id}
                className="grid grid-cols-12 gap-2 items-center bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2.5"
              >
                <div className="col-span-5 text-sm font-black text-amber-900">
                  {formatVND(tier.minAmount)}
                </div>
                <div className="col-span-3">
                  <span className="inline-flex items-center gap-1 text-sm font-black text-emerald-700">
                    +{tier.bonusPoints} đ
                  </span>
                </div>
                <div className="col-span-3 text-xs text-slate-500 font-medium truncate">
                  {tier.label || '—'}
                </div>
                {role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (setting.bonus_tiers || []).filter(t => t.id !== tier.id);
                      setSetting({ ...setting, bonus_tiers: updated });
                    }}
                    className="col-span-1 flex justify-center p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new tier form */}
          {role === 'ADMIN' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-700">+ Thêm mốc thưởng mới</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Mốc hóa đơn (VNĐ)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="VD: 1000000"
                    value={newTierAmount}
                    onChange={(e) => setNewTierAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {newTierAmount && (
                    <span className="text-[10px] text-amber-600 font-medium">
                      = {formatVND(Number(newTierAmount))}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Điểm thưởng thêm
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="VD: 50"
                    value={newTierPoints}
                    onChange={(e) => setNewTierPoints(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Nhãn (tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Mốc 1 triệu"
                    value={newTierLabel}
                    onChange={(e) => setNewTierLabel(e.target.value)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const amt = Number(newTierAmount);
                  const pts = Number(newTierPoints);
                  if (!amt || amt < 1000) {
                    error('Mốc không hợp lệ', 'Vui lòng nhập mốc hóa đơn tối thiểu 1.000đ');
                    return;
                  }
                  if (!pts || pts < 1) {
                    error('Điểm không hợp lệ', 'Số điểm thưởng phải ≥ 1');
                    return;
                  }
                  const existing = setting.bonus_tiers || [];
                  if (existing.some(t => t.minAmount === amt)) {
                    error('Mốc trùng lập', `Đã có mốc ${formatVND(amt)} rồi`);
                    return;
                  }
                  const newTier: BonusTier = {
                    id: 'bt-' + Math.random().toString(36).substring(2, 7),
                    minAmount: amt,
                    bonusPoints: pts,
                    label: newTierLabel.trim() || undefined,
                  };
                  setSetting({ ...setting, bonus_tiers: [...existing, newTier] });
                  setNewTierAmount('');
                  setNewTierPoints('');
                  setNewTierLabel('');
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm mốc
              </button>
            </div>
          )}
        </div>

        {/* Submit */}
        {role === 'ADMIN' && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'Lưu Cài Đặt Tích Điểm'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
