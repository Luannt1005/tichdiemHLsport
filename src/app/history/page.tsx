'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  User,
} from 'lucide-react';
import { loyaltyApi } from '@/lib/api/loyalty-api';
import { formatDateTime, formatVND } from '@/lib/points-engine';
import { TRANSACTION_TYPE_STYLES, formatPointsDelta, pointsTextClass } from '@/lib/transaction-display';
import { useToast } from '@/components/ui/Toast';
import { PointTransaction } from '@/types/database';

export default function HistoryPage() {
  const { error } = useToast();
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Pagination state (max 20 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loyaltyApi.getTransactionsPaginated({
      query,
      type: typeFilter,
      page: currentPage,
      pageSize: PAGE_SIZE,
    })
      .then((data) => {
        if (!cancelled) {
          setTransactions(data.transactions);
          setTotalTransactions(data.total);
          setTotalPages(data.totalPages || 1);
        }
      })
      .catch((err) => {
        if (!cancelled) error('Không tải được lịch sử giao dịch', err instanceof Error ? err.message : '');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, typeFilter, currentPage, error]);

  const paginatedTransactions = transactions;

  return (
    <div className="space-y-6">

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
              setLoading(true);
            }}
            placeholder="Tìm theo tên khách, SĐT, nội dung..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-semibold text-slate-600">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'EARN', label: '+ Tích điểm' },
            { key: 'REDEEM', label: '- Dùng điểm' },
            { key: 'EXPIRE', label: 'Hết hạn' },
            { key: 'ADJUST', label: 'Điều chỉnh' },
            { key: 'REFUND', label: '+ Hoàn điểm' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTypeFilter(item.key);
                setCurrentPage(1);
                setLoading(true);
              }}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                typeFilter === item.key
                  ? 'bg-slate-900 text-white shadow-xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && (
          <div className="py-12 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
        )}
        {!loading && transactions.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            Không tìm thấy giao dịch nào phù hợp với bộ lọc.
          </div>
        )}
        {!loading && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Số điện thoại</th>
                  <th className="py-3 px-4">Loại giao dịch</th>
                  <th className="py-3 px-4 text-right">Biến động điểm</th>
                  <th className="py-3 px-4 text-right">Số tiền GD</th>
                  <th className="py-3 px-4">Nội dung</th>
                  <th className="py-3 px-4">Mã tham chiếu</th>
                  <th className="py-3 px-4">Nhân viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.map((tx) => {
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Time */}
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateTime(tx.created_at)}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/customers/${tx.customer_id}`}
                          className="hover:text-emerald-600 flex items-center gap-1.5"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {tx.customer_name || 'Khách hàng'}
                        </Link>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {tx.customer_phone || '---'}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] ${TRANSACTION_TYPE_STYLES[tx.type].badgeClass}`}
                        >
                          {TRANSACTION_TYPE_STYLES[tx.type].label}
                        </span>
                      </td>

                      {/* Points Delta */}
                      <td className="py-3.5 px-4 text-right font-black whitespace-nowrap">
                        <span
                          className={pointsTextClass(tx)}
                        >
                          {formatPointsDelta(tx.points)} đ
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700 whitespace-nowrap">
                        {tx.amount > 0 ? formatVND(tx.amount) : '---'}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {tx.description || 'Giao dịch điểm'}
                      </td>

                      {/* Ref */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {tx.reference_id || tx.reference_type}
                      </td>

                      {/* Staff */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {tx.created_by}
                      </td>
                    </tr>
                  );
                })}
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
                {Math.min(currentPage * PAGE_SIZE, totalTransactions)}
              </span>{' '}
              trong tổng số <span className="font-bold text-slate-800">{totalTransactions}</span> giao dịch
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - currentPage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                  }
                  return null;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    disabled={loading}
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
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
