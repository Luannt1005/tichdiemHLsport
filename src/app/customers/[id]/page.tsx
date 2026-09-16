'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Award,
  ClockAlert,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  MinusCircle,
  Sliders,
  Calendar,
  Layers,
  History,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { Customer, PointLot, PointTransaction, UserRole } from '@/types/database';
import { formatDateOnly, formatDateTime, formatVND } from '@/lib/points-engine';
import { EarnPointsModal } from '@/components/pos/EarnPointsModal';
import { RedeemPointsModal } from '@/components/pos/RedeemPointsModal';
import { EditCustomerModal } from '@/components/modals/EditCustomerModal';
import { useToast } from '@/components/ui/Toast';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { success, error } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lots, setLots] = useState<PointLot[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LOTS' | 'HISTORY'>('OVERVIEW');
  const [role, setRole] = useState<UserRole>('ADMIN');

  // Modals
  const [isEarnOpen, setIsEarnOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState('Thưởng điểm tri ân khách hàng thân thiết');

  const loadCustomerData = async () => {
    if (!customerId) return;
    const c = await loyaltyStore.getCustomerById(customerId);
    if (!c) return;
    setCustomer(c);
    const l = await loyaltyStore.getCustomerLots(customerId);
    setLots(l);
    const t = await loyaltyStore.getTransactions({ customerId });
    setTransactions(t);
    setRole(loyaltyStore.getRole());
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    try {
      await loyaltyStore.adjustPoints({
        customerId: customer.id,
        pointsDelta: adjustPoints,
        reason: adjustReason,
      });
      success('Thành công', `Đã điều chỉnh ${adjustPoints > 0 ? `+${adjustPoints}` : adjustPoints} điểm`);
      setIsAdjustOpen(false);
      loadCustomerData();
    } catch (err: any) {
      error('Lỗi điều chỉnh', err.message);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer) return;
    setIsDeleting(true);
    try {
      await loyaltyStore.deleteCustomer(customer.id);
      try {
        await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      } catch (_) {}
      success('Đã xóa khách hàng', `Khách hàng ${customer.name} đã được xóa thành công.`);
      setIsDeleteOpen(false);
      router.push('/customers');
    } catch (err: any) {
      error('Lỗi khi xóa khách hàng', err.message || 'Không thể xóa khách hàng này.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!customer) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Đang tải thông tin khách hàng...
      </div>
    );
  }

  // Active lots only
  const activeLots = lots.filter((l) => l.status === 'ACTIVE' && l.remaining_points > 0);

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh sách khách hàng</span>
      </Link>

      {/* Customer Header Profile Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white font-black text-2xl flex items-center justify-center shadow-md shrink-0">
              {customer.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{customer.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {customer.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 font-mono text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tham gia: {formatDateOnly(customer.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsEarnOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Cộng điểm tiền sân</span>
            </button>

            <button
              onClick={() => setIsRedeemOpen(true)}
              disabled={customer.total_points <= 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <MinusCircle className="w-4 h-4" />
              <span>- Dùng điểm</span>
            </button>

            {role === 'ADMIN' && (
              <button
                onClick={() => setIsAdjustOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                <Sliders className="w-4 h-4" />
                <span>Điều chỉnh</span>
              </button>
            )}

            <button
              onClick={() => setIsEditOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>Sửa thông tin</span>
            </button>

            <button
              onClick={() => setIsDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl border border-rose-200/60 transition-all"
              title="Xóa hồ sơ khách hàng"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Points */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" /> Điểm hiện tại
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
            {customer.total_points.toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-slate-400">điểm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Khả dụng để đổi ưu đãi</p>
        </div>

        {/* Lifetime Earned */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" /> Tổng điểm đã tích
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {customer.lifetime_points_earned.toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-slate-400">điểm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Tổng tích luỹ lịch sử</p>
        </div>

        {/* Lifetime Used */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-amber-600" /> Điểm đã sử dụng
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {customer.lifetime_points_used.toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-slate-400">điểm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đã quy đổi thành công</p>
        </div>

        {/* Expiring in 30 days */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <ClockAlert className="w-4 h-4 text-rose-500" /> Sắp hết hạn (30 ngày)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-2">
            {(customer.expiring_soon_points || 0).toLocaleString('vi-VN')}{' '}
            <span className="text-xs font-normal text-slate-400">điểm</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cần nhắc khách sử dụng</p>
        </div>
      </div>

      {/* Tabs Nav */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Tổng quan & Thông tin</span>
        </button>

        <button
          onClick={() => setActiveTab('LOTS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'LOTS'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Các lô điểm còn hiệu lực ({activeLots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử biến động ({transactions.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Profile Details */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Hồ sơ khách hàng</h3>
              <button
                onClick={() => setIsEditOpen(true)}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Mã khách hàng</span>
                <span className="font-mono font-bold text-slate-700">{customer.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Họ và tên</span>
                <span className="font-bold text-slate-900">{customer.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Số điện thoại</span>
                <span className="font-mono font-bold text-slate-900">{customer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Email</span>
                <span className="text-slate-700">{customer.email || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Trạng thái tài khoản</span>
                <span className="font-bold text-emerald-700">{customer.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Giao dịch gần nhất</span>
                <span className="text-slate-600">
                  {customer.last_transaction_at ? formatDateTime(customer.last_transaction_at) : 'Chưa có'}
                </span>
              </div>
            </div>
          </div>

          {/* Active Lots Preview */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Các lô điểm có thể dùng (FEFO)</span>
              </h3>
              <button
                onClick={() => setActiveTab('LOTS')}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Xem tất cả ({activeLots.length})
              </button>
            </div>

            {activeLots.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Khách hàng hiện không có lô điểm nào còn hiệu lực.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeLots.slice(0, 3).map((lot, idx) => (
                  <div
                    key={lot.id}
                    className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-150 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shadow-2xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {lot.remaining_points} / {lot.original_points} điểm
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Hết hạn: {formatDateOnly(lot.expires_at)} ({lot.days_left || 0} ngày nữa)
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      Còn hiệu lực
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'LOTS' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Chi tiết tất cả lô điểm của khách hàng</span>
            </h3>
            <span className="text-xs text-slate-400">
              Nguyên tắc FEFO: Lô hết hạn sớm nhất sẽ tự động được ưu tiên trừ trước
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Mã lô</th>
                  <th className="py-3 px-4">Điểm ban đầu</th>
                  <th className="py-3 px-4">Điểm còn lại</th>
                  <th className="py-3 px-4">Ngày tích</th>
                  <th className="py-3 px-4">Hạn sử dụng</th>
                  <th className="py-3 px-4">Còn lại</th>
                  <th className="py-3 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lots.map((lot) => (
                  <tr key={lot.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{lot.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">+{lot.original_points}</td>
                    <td className="py-3 px-4 font-black text-emerald-600">{lot.remaining_points}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateOnly(lot.earned_at)}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{formatDateOnly(lot.expires_at)}</td>
                    <td className="py-3 px-4">
                      {lot.status === 'ACTIVE' ? (
                        <span className="text-slate-700 font-semibold">{lot.days_left} ngày</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          lot.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : lot.status === 'EXPIRED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lot.status === 'ACTIVE'
                          ? 'Khả dụng'
                          : lot.status === 'EXPIRED'
                          ? 'Đã hết hạn'
                          : 'Đã dùng hết'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <span>Toàn bộ lịch sử biến động điểm</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Loại GD</th>
                  <th className="py-3 px-4">Biến động</th>
                  <th className="py-3 px-4">Tiền sân / Quy đổi</th>
                  <th className="py-3 px-4">Nội dung</th>
                  <th className="py-3 px-4">Người thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.type === 'EARN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.type === 'REDEEM'
                            ? 'bg-rose-100 text-rose-800'
                            : tx.type === 'EXPIRE'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black">
                      <span
                        className={
                          tx.points > 0
                            ? 'text-emerald-600'
                            : tx.points < 0
                            ? 'text-rose-600'
                            : 'text-slate-600'
                        }
                      >
                        {tx.points > 0 ? `+${tx.points}` : tx.points} đ
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      {tx.amount > 0 ? formatVND(tx.amount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {tx.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {tx.created_by || 'STAFF'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Points Modal (Portal) */}
      {isAdjustOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden my-auto animate-scale-in">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Điều Chỉnh Điểm (Admin)</h3>
                    <p className="text-xs text-slate-500">Khách: {customer.name} ({customer.phone})</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAdjustOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAdjust} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điểm điều chỉnh (+ để cộng thêm, - để giảm bớt)
                  </label>
                  <input
                    type="number"
                    required
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lý do điều chỉnh (Audit log)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="VD: Thưởng thành viên xuất sắc hoặc đền bù sự cố kỹ thuật..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdjustOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-500"
                  >
                    Xác nhận điều chỉnh
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        customer={customer}
        onSuccess={(updated) => {
          setCustomer(updated);
          loadCustomerData();
        }}
      />

      {/* Modals for earn / redeem */}
      <EarnPointsModal
        isOpen={isEarnOpen}
        onClose={() => setIsEarnOpen(false)}
        initialCustomer={customer}
        initialPhone={customer.phone}
        onSuccess={loadCustomerData}
      />
      <RedeemPointsModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        initialCustomer={customer}
        onSuccess={loadCustomerData}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/30 backdrop-blur-xs animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden my-auto animate-scale-in">
              <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-rose-50 to-red-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Khách Hàng</h3>
                    <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDeleteOpen(false)}
                  disabled={isDeleting}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white/80 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-rose-900 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-rose-700 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Cảnh báo xóa dữ liệu
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Bạn có chắc chắn muốn xóa khách hàng <strong>{customer.name}</strong> (SĐT: <strong>{customer.phone}</strong>) không?
                  </p>
                  <p className="text-[11px] text-rose-600">
                    Toàn bộ số dư <strong>{customer.total_points} điểm</strong>, các lô điểm khả dụng và lịch sử giao dịch liên quan sẽ bị xóa hoàn toàn khỏi hệ thống.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    disabled={isDeleting}
                    className="px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteCustomer}
                    disabled={isDeleting}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isDeleting ? (
                      <span>Đang xóa...</span>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Xác nhận xóa</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
