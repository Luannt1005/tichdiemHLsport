'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ClockAlert, Calendar, ArrowRight, User } from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { PointLot, Customer } from '@/types/database';
import { formatDateOnly } from '@/lib/points-engine';

export function ExpiringSoonSection() {
  const [days, setDays] = useState<number>(30);
  const [lots, setLots] = useState<(PointLot & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loyaltyStore.getExpiringLots(days).then((data) => {
      setLots(data);
      setLoading(false);
    });
  }, [days]);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
            <ClockAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Điểm Sắp Hết Hạn</h3>
            <p className="text-xs text-slate-500">
              Các lô điểm sắp quá hạn hiệu lực cần nhắc khách sử dụng
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
          {[7, 30, 60].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                days === d ? 'bg-white text-rose-600 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              {d} ngày tới
            </button>
          ))}
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
      ) : lots.length === 0 ? (
        <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-xs font-medium text-slate-500">
            Không có điểm nào sắp hết hạn trong {days} ngày tới.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Khách hàng</th>
                <th className="py-2.5 px-3">Số điện thoại</th>
                <th className="py-2.5 px-3 text-right">Điểm sắp hết hạn</th>
                <th className="py-2.5 px-3">Ngày hết hạn</th>
                <th className="py-2.5 px-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lots.map((lot) => (
                <tr key={lot.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-800">
                    <Link
                      href={`/customers/${lot.customer_id}`}
                      className="hover:text-emerald-600 flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {lot.customer?.name || 'Khách hàng'}
                    </Link>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {lot.customer?.phone || '---'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      {lot.remaining_points} điểm
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateOnly(lot.expires_at)}</span>
                      {lot.days_left !== undefined && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            lot.days_left <= 7
                              ? 'bg-rose-50 text-rose-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          (còn {lot.days_left} ngày)
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Link
                      href={`/customers/${lot.customer_id}`}
                      className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                    >
                      <span>Xem hồ sơ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
