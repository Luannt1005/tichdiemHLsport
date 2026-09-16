'use client';

import React from 'react';
import { Users, UserCheck, Award, TrendingUp, TrendingDown, ClockAlert } from 'lucide-react';
import { DashboardStats } from '@/types/database';

interface KpiCardsProps {
  stats: DashboardStats;
}

export function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      title: 'Tổng khách hàng',
      value: stats.totalCustomers.toLocaleString('vi-VN'),
      subtitle: 'Hội viên sân cầu lông',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Khách đang có điểm',
      value: stats.customersWithPoints.toLocaleString('vi-VN'),
      subtitle: `${Math.round((stats.customersWithPoints / (stats.totalCustomers || 1)) * 100)}% tổng số khách`,
      icon: UserCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-100',
    },
    {
      title: 'Điểm đang lưu hành',
      value: stats.circulatingPoints.toLocaleString('vi-VN'),
      subtitle: 'Khả dụng trên toàn hệ thống',
      icon: Award,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      highlight: true,
    },
    {
      title: 'Tổng điểm đã cộng',
      value: stats.totalEarnedPoints.toLocaleString('vi-VN'),
      subtitle: 'Tích lũy từ tiền sân',
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-100',
    },
    {
      title: 'Tổng điểm đã sử dụng',
      value: stats.totalUsedPoints.toLocaleString('vi-VN'),
      subtitle: 'Quy đổi ưu đãi giảm giá',
      icon: TrendingDown,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Tổng điểm đã hết hạn',
      value: stats.totalExpiredPoints.toLocaleString('vi-VN'),
      subtitle: 'Tự động hủy sau 90 ngày',
      icon: ClockAlert,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-2xl bg-white border ${card.borderColor} shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
              card.highlight ? 'ring-2 ring-amber-400/30' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 line-clamp-1">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-black text-slate-900 tracking-tight ${card.highlight ? 'text-amber-700' : ''}`}>
                {card.value}
              </div>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
