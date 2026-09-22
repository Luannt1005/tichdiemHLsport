'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  MinusCircle,
  ArrowRight,
  TrendingUp,
  Users,
  Activity,
} from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { DashboardStats, PointTransaction } from '@/types/database';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { PointChart } from '@/components/dashboard/PointChart';
import { ExpiringSoonSection } from '@/components/dashboard/ExpiringSoonSection';
import { EarnPointsModal } from '@/components/pos/EarnPointsModal';
import { RedeemPointsModal } from '@/components/pos/RedeemPointsModal';
import { formatDateTime, formatVND } from '@/lib/points-engine';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    customersWithPoints: 0,
    circulatingPoints: 0,
    totalEarnedPoints: 0,
    totalUsedPoints: 0,
    totalExpiredPoints: 0,
    expiringIn30Days: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<PointTransaction[]>([]);
  const [isEarnOpen, setIsEarnOpen] = useState(false);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);

  const loadData = async () => {
    const s = await loyaltyStore.getDashboardStats();
    setStats(s);
    const txs = await loyaltyStore.getTransactions({ limit: 5 });
    setRecentTransactions(txs);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">

      {/* KPI Cards */}
      <KpiCards stats={stats} />

      {/* Main Grid: Chart + Expiring Soon */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Chart */}
        <div className="lg:col-span-7">
          <PointChart />
        </div>

        {/* Expiring Soon Section */}
        <div className="lg:col-span-5">
          <ExpiringSoonSection />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">Giao Dịch Gần Đây</h3>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>Xem tất cả lịch sử</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2 px-3">Thời gian</th>
                <th className="py-2 px-3">Khách hàng</th>
                <th className="py-2 px-3">Loại giao dịch</th>
                <th className="py-2 px-3 text-right">Biến động điểm</th>
                <th className="py-2 px-3 text-right">Số tiền</th>
                <th className="py-2 px-3">Nội dung</th>
                <th className="py-2 px-3">Nhân viên</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const isPositive = tx.points > 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <Link
                        href={`/customers/${tx.customer_id}`}
                        className="hover:text-emerald-600"
                      >
                        {tx.customer_name || 'Khách hàng'}
                      </Link>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.type === 'EARN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.type === 'REDEEM'
                            ? 'bg-rose-100 text-rose-800'
                            : tx.type === 'EXPIRE'
                            ? 'bg-amber-100 text-amber-800'
                            : tx.type === 'ADJUST'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {tx.type === 'EARN'
                          ? 'Tích điểm'
                          : tx.type === 'REDEEM'
                          ? 'Đổi điểm'
                          : tx.type === 'EXPIRE'
                          ? 'Hết hạn'
                          : tx.type === 'ADJUST'
                          ? 'Điều chỉnh'
                          : 'Hoàn điểm'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span
                        className={
                          isPositive
                            ? 'text-emerald-600'
                            : tx.type === 'EXPIRE'
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }
                      >
                        {isPositive ? `+${tx.points}` : tx.points} đ
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 font-mono">
                      {tx.amount > 0 ? formatVND(tx.amount) : '---'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {tx.description || 'Giao dịch điểm'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-medium">
                      {tx.created_by}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <EarnPointsModal
        isOpen={isEarnOpen}
        onClose={() => setIsEarnOpen(false)}
        onSuccess={loadData}
      />
      <RedeemPointsModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
