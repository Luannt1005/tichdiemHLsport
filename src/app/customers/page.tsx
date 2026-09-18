'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  UserPlus,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Phone,
  Mail,
  Calendar,
  Filter,
  CheckCircle2,
  ClockAlert,
  Edit2,
} from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { Customer } from '@/types/database';
import { formatDateOnly, formatDateTime, isValidVietnamesePhone, normalizePhone } from '@/lib/points-engine';
import { EarnPointsModal } from '@/components/pos/EarnPointsModal';
import { RedeemPointsModal } from '@/components/pos/RedeemPointsModal';
import { createPortal } from 'react-dom';
import { useToast } from '@/components/ui/Toast';

export default function CustomersPage() {
  const { success, error } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Pagination state (max 20 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEarnOpen, setIsEarnOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    const list = await loyaltyStore.getCustomers(search, filter);
    setCustomers(list);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
    setCurrentPage(1);
  }, [search, filter]);

  const totalPages = Math.ceil(customers.length / PAGE_SIZE) || 1;
  const paginatedCustomers = customers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPhone = normalizePhone(newPhone);
    if (!isValidVietnamesePhone(formattedPhone)) {
      error('Lỗi SĐT', 'Số điện thoại không hợp lệ (cần 10 chữ số, VD: 0901234567)');
      return;
    }

    try {
      await loyaltyStore.createCustomer(formattedPhone, newName.trim(), newEmail.trim() || undefined);
      success('Thành công', `Đã thêm khách hàng ${newName}`);
      setIsAddOpen(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      await loadCustomers();
    } catch (err: any) {
      error('Lỗi tạo khách', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar + Add Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-semibold text-slate-600">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'HAS_POINTS', label: 'Có điểm' },
            { key: 'NO_POINTS', label: '0 điểm' },
            { key: 'EXPIRING_SOON', label: 'Sắp hết hạn' },
            { key: 'EXPIRED', label: 'Đã hết hạn' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                filter === f.key
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add Customer Button */}
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 w-full md:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4" />
          <span>Thêm Khách Hàng</span>
        </button>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách...</div>
        ) : customers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Không tìm thấy khách hàng nào khớp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4 text-right">Điểm hiện tại</th>
                  <th className="py-3 px-4">Giao dịch gần nhất</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <Link
                        href={`/customers/${c.id}`}
                        className="hover:text-emerald-600 flex items-center gap-2"
                      >
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="truncate">{c.name}</span>
                      </Link>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600">
                      {c.phone}
                    </td>

                    {/* Current Points */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-sm font-black text-emerald-700">
                        {c.total_points.toLocaleString('vi-VN')}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400 font-normal">điểm</span>
                    </td>

                    {/* Last tx */}
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateOnly(c.last_transaction_at)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Cộng điểm tiền sân"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsEarnOpen(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          title="Sử dụng điểm"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsRedeemOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30"
                          disabled={c.total_points <= 0}
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                        <Link
                          title="Xem chi tiết hồ sơ"
                          href={`/customers/${c.id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar (Max 20 per page) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-500 font-medium">
              Hiển thị <span className="font-bold text-slate-800">{(currentPage - 1) * PAGE_SIZE + 1}</span> -{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * PAGE_SIZE, customers.length)}
              </span>{' '}
              trong tổng số <span className="font-bold text-slate-800">{customers.length}</span> hội viên
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 backdrop-blur-[2px] animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden my-auto animate-scale-in">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="text-base font-bold text-slate-900">Thêm Khách Hàng Mới</h3>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="VD: 0988123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="VD: Nguyễn Tuấn Anh"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Email (tùy chọn)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="VD: anh.nguyen@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-500"
                  >
                    Tạo khách hàng
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Modals for quick earn / redeem */}
      <EarnPointsModal
        isOpen={isEarnOpen}
        onClose={() => setIsEarnOpen(false)}
        initialCustomer={selectedCustomer}
        initialPhone={selectedCustomer?.phone || ''}
        onSuccess={loadCustomers}
      />
      <RedeemPointsModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        initialCustomer={selectedCustomer}
        onSuccess={loadCustomers}
      />
    </div>
  );
}
