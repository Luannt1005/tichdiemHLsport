'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Calculator,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Database,
  Copy,
  Check,
} from 'lucide-react';
import { loyaltyStore, DEFAULT_SETTING } from '@/lib/store/loyalty-store';
import { PointSetting, RoundingMode, UserRole } from '@/types/database';
import { calculatePoints, formatVND } from '@/lib/points-engine';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { success, error, info } = useToast();
  const [setting, setSetting] = useState<PointSetting>(DEFAULT_SETTING);
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [loading, setLoading] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Sandbox simulation test values
  const [testAmount, setTestAmount] = useState<number>(75000);

  useEffect(() => {
    loyaltyStore.getPointSettings().then(setSetting);
    setRole(loyaltyStore.getRole());
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'ADMIN') {
      error('Không đủ quyền hạn', 'Chỉ tài khoản ADMIN mới có quyền lưu thay đổi cấu hình tích điểm!');
      return;
    }

    setLoading(true);
    try {
      await loyaltyStore.updatePointSettings({
        amount_per_point: setting.amount_per_point,
        points_per_amount: setting.points_per_amount,
        rounding_mode: setting.rounding_mode,
        expiry_days: setting.expiry_days,
      });

      success(
        'Lưu cấu hình thành công!',
        `Tỷ lệ mới: ${formatVND(setting.amount_per_point)} = ${setting.points_per_amount} điểm, Hạn dùng: ${setting.expiry_days} ngày.`
      );
    } catch (err: any) {
      error('Lỗi lưu cấu hình', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Live sandbox calculation
  const sandboxFloor = Math.floor((testAmount / setting.amount_per_point) * setting.points_per_amount);
  const sandboxRound = Math.round((testAmount / setting.amount_per_point) * setting.points_per_amount);
  const sandboxCeil = Math.ceil((testAmount / setting.amount_per_point) * setting.points_per_amount);
  const currentResult = calculatePoints(
    testAmount,
    setting.amount_per_point,
    setting.points_per_amount,
    setting.rounding_mode
  );

  const handleCopySchemaSql = () => {
    const sqlScript = `-- HƯỚNG DẪN: Mở Supabase Dashboard -> Vào Project dzemhqkvccmpoaumoytf -> Chọn SQL Editor -> Dán toàn bộ file supabase_schema.sql và supabase_seed.sql trong thư mục gốc rồi nhấn Run.`;
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    info('Đã sao chép hướng dẫn SQL', 'File supabase_schema.sql nằm ngay trong thư mục gốc dự án của bạn!');
    setTimeout(() => setCopiedSql(false), 3000);
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
                type="number"
                step="1000"
                min="1000"
                disabled={role !== 'ADMIN'}
                value={setting.amount_per_point}
                onChange={(e) =>
                  setSetting({ ...setting, amount_per_point: Math.max(1000, Number(e.target.value)) })
                }
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
                type="number"
                min="1"
                disabled={role !== 'ADMIN'}
                value={setting.points_per_amount}
                onChange={(e) =>
                  setSetting({ ...setting, points_per_amount: Math.max(1, Number(e.target.value)) })
                }
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mặc định: 1 điểm cho mỗi {formatVND(setting.amount_per_point)}
              </span>
            </div>
          </div>

          {/* Quick preset options */}
          {role === 'ADMIN' && (
            <div className="pt-2">
              <span className="text-xs text-slate-500 font-medium">Tùy chọn nhanh thường dùng:</span>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {[
                  { amount: 10000, points: 1, label: '10.000đ = 1 điểm (Chuẩn)' },
                  { amount: 20000, points: 1, label: '20.000đ = 1 điểm' },
                  { amount: 50000, points: 5, label: '50.000đ = 5 điểm' },
                  { amount: 100000, points: 10, label: '100.000đ = 10 điểm' },
                ].map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setSetting({
                        ...setting,
                        amount_per_point: opt.amount,
                        points_per_amount: opt.points,
                      })
                    }
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Làm tròn điểm (Rounding mode) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Quy Tắc Làm Tròn Điểm</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                mode: 'FLOOR',
                title: 'Làm tròn xuống',
                desc: 'Khuyến nghị dùng. Bỏ phần số lẻ phía sau.',
              },
              {
                mode: 'ROUND',
                title: 'Làm tròn gần nhất',
                desc: 'Từ 0.5 trở lên làm tròn lên 1 điểm, dưới 0.5 làm tròn xuống.',
              },
              {
                mode: 'CEIL',
                title: 'Làm tròn lên',
                desc: 'Bất kỳ phần số lẻ nào cũng được làm tròn lên 1 điểm.',
              },
            ].map((opt) => (
              <label
                key={opt.mode}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  setting.rounding_mode === opt.mode
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-900">{opt.title}</span>
                  <input
                    type="radio"
                    name="rounding_mode"
                    disabled={role !== 'ADMIN'}
                    value={opt.mode}
                    checked={setting.rounding_mode === opt.mode}
                    onChange={() =>
                      setSetting({ ...setting, rounding_mode: opt.mode as RoundingMode })
                    }
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{opt.desc}</p>
              </label>
            ))}
          </div>

          {/* Interactive Calculator Simulator */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mt-3 space-y-3">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" /> Thử nghiệm tính điểm thực tế
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-60">
                <span className="text-[11px] text-slate-500 block mb-1">Nhập số tiền hóa đơn:</span>
                <input
                  type="number"
                  step="5000"
                  value={testAmount}
                  onChange={(e) => setTestAmount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-2 w-full text-center text-xs">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Làm tròn xuống:</span>
                  <span className="font-bold text-slate-800">{sandboxFloor} điểm</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Làm tròn gần nhất:</span>
                  <span className="font-bold text-slate-800">{sandboxRound} điểm</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Làm tròn lên:</span>
                  <span className="font-bold text-slate-800">{sandboxCeil} điểm</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-emerald-800 font-semibold pt-1">
              → Khách sẽ nhận được:{' '}
              <span className="text-emerald-700 font-bold underline">{currentResult} điểm</span>
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

          {/* Preset Buttons */}
          {role === 'ADMIN' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Mốc thông dụng:</span>
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSetting({ ...setting, expiry_days: d })}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    setting.expiry_days === d
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d} ngày {d === 90 ? '(Mặc định)' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Note */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Lưu ý về hạn dùng:
            </div>
            <p>
              Khi bạn thay đổi thời hạn sang {setting.expiry_days} ngày, các điểm đã tích trước đây vẫn giữ nguyên ngày hết hạn ban đầu để đảm bảo quyền lợi cho khách hàng.
            </p>
          </div>
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
