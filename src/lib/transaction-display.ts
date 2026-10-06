import { LotStatus, PointTransaction, TransactionType } from '@/types/database';

interface DisplayStyle {
  label: string;
  badgeClass: string;
}

/** Nhãn + màu badge theo loại giao dịch (design system: EARN emerald · REDEEM rose · EXPIRE amber · ADJUST blue · REFUND indigo) */
export const TRANSACTION_TYPE_STYLES: Record<TransactionType, DisplayStyle> = {
  EARN: { label: 'Tích điểm', badgeClass: 'bg-emerald-100 text-emerald-800' },
  REDEEM: { label: 'Dùng điểm', badgeClass: 'bg-rose-100 text-rose-800' },
  EXPIRE: { label: 'Hết hạn', badgeClass: 'bg-amber-100 text-amber-800' },
  ADJUST: { label: 'Điều chỉnh', badgeClass: 'bg-blue-100 text-blue-800' },
  REFUND: { label: 'Hoàn điểm', badgeClass: 'bg-indigo-100 text-indigo-800' },
};

export const LOT_STATUS_STYLES: Record<LotStatus, DisplayStyle> = {
  ACTIVE: { label: 'Khả dụng', badgeClass: 'bg-emerald-100 text-emerald-800' },
  EXPIRED: { label: 'Đã hết hạn', badgeClass: 'bg-amber-100 text-amber-800' },
  FULLY_USED: { label: 'Đã dùng hết', badgeClass: 'bg-slate-100 text-slate-600' },
};

/** Màu chữ cho số điểm biến động: cộng → xanh, hết hạn → amber, trừ → rose */
export function pointsTextClass(tx: Pick<PointTransaction, 'type' | 'points'>): string {
  if (tx.points > 0) return 'text-emerald-600';
  if (tx.type === 'EXPIRE') return 'text-amber-600';
  if (tx.points < 0) return 'text-rose-600';
  return 'text-slate-600';
}

/** Hiển thị số điểm có dấu: +120 / -50 */
export function formatPointsDelta(points: number): string {
  return `${points > 0 ? '+' : ''}${points.toLocaleString('vi-VN')}`;
}
