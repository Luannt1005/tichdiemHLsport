'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { ChartDataPoint } from '@/types/database';

export function PointChart() {
  const [period, setPeriod] = useState<'7d' | '30d' | '12m'>('7d');
  const [data, setData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    loyaltyStore.getChartData(period).then(setData);
  }, [period]);

  // Find maximum value for SVG scaling
  const maxValue = Math.max(...data.map((d) => Math.max(d.earned, d.redeemed, d.expired)), 100);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Biến Động Cộng & Trừ Điểm</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
              Live Flow
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            So sánh tổng điểm phát sinh từ tiền sân, điểm khách sử dụng và điểm hết hạn
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
          {(['7d', '30d', '12m'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === p ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              {p === '7d' ? '7 ngày' : p === '30d' ? '30 ngày' : '12 tháng'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 sm:gap-6 mb-4 text-xs font-medium">
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Điểm cộng (+EARN)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <span>Điểm đã dùng (-REDEEM)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Điểm hết hạn (-EXPIRE)</span>
        </div>
      </div>

      {/* Modern Bars Graphic */}
      <div className="h-64 flex items-end gap-2 sm:gap-4 pt-6 border-b border-slate-100">
        {data.map((item, idx) => {
          const earnedHeight = Math.max((item.earned / maxValue) * 180, 4);
          const redeemedHeight = Math.max((item.redeemed / maxValue) * 180, 0);
          const expiredHeight = Math.max((item.expired / maxValue) * 180, 0);

          return (
            <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
              {/* Tooltip on hover */}
              <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[11px] py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap">
                <span className="font-bold text-slate-200">{item.label}</span>
                <span className="text-emerald-400">+{item.earned} điểm</span>
                {item.redeemed > 0 && <span className="text-rose-400">-{item.redeemed} điểm</span>}
                {item.expired > 0 && <span className="text-amber-400">-{item.expired} điểm hết hạn</span>}
              </div>

              {/* Stacked / Grouped Bars */}
              <div className="flex items-end gap-1 w-full max-w-[42px] justify-center">
                {/* Earned Bar */}
                <div
                  style={{ height: `${earnedHeight}px` }}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 rounded-t-md transition-all cursor-pointer"
                  title={`Cộng: ${item.earned}`}
                />
                {/* Redeemed Bar */}
                {item.redeemed > 0 && (
                  <div
                    style={{ height: `${redeemedHeight}px` }}
                    className="flex-1 bg-rose-500 hover:bg-rose-400 rounded-t-md transition-all cursor-pointer"
                    title={`Dùng: ${item.redeemed}`}
                  />
                )}
                {/* Expired Bar */}
                {item.expired > 0 && (
                  <div
                    style={{ height: `${expiredHeight}px` }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 rounded-t-md transition-all cursor-pointer"
                    title={`Hết hạn: ${item.expired}`}
                  />
                )}
              </div>

              {/* Label */}
              <span className="text-[11px] font-semibold text-slate-500 mt-2 truncate w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
