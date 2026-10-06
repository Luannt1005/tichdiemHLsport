import { RoundingMode, BonusTier, PointSetting } from '@/types/database';

/**
 * Calculates loyalty points earned from payment amount based on setting rules
 */
export function calculatePoints(
  amount: number,
  amountPerPoint: number = 10000,
  pointsPerAmount: number = 1,
  roundingMode: RoundingMode = 'FLOOR'
): number {
  if (amount <= 0 || amountPerPoint <= 0) return 0;

  const rawPoints = (amount / amountPerPoint) * pointsPerAmount;

  let points = 0;
  switch (roundingMode) {
    case 'CEIL':
      points = Math.ceil(rawPoints);
      break;
    case 'ROUND':
      points = Math.round(rawPoints);
      break;
    case 'FLOOR':
    default:
      points = Math.floor(rawPoints);
      break;
  }

  return Math.max(1, points);
}

/**
 * Tìm bonus points cho mốc hóa đơn cao nhất mà amount đạt được.
 * Logic: KHÔNG cộng dồn — chỉ áp dụng 1 mốc cao nhất phù hợp.
 * VD: tiers=[{1tr:50}, {2tr:150}], amount=2.5tr → bonus=150 (mốc 2tr)
 */
export function calculateBonusPoints(amount: number, tiers?: BonusTier[]): {
  bonusPoints: number;
  matchedTier: BonusTier | null;
} {
  if (!tiers || tiers.length === 0 || amount <= 0) {
    return { bonusPoints: 0, matchedTier: null };
  }

  // Sắp xếp giảm dần theo minAmount → tìm mốc cao nhất đạt được
  const sorted = [...tiers].sort((a, b) => b.minAmount - a.minAmount);
  const matched = sorted.find((t) => amount >= t.minAmount) || null;

  return {
    bonusPoints: matched ? matched.bonusPoints : 0,
    matchedTier: matched,
  };
}


/**
 * Calculate expiry date from today + days
 */
export function calculateExpiryDate(days: number = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Calculate remaining days until expiration
 */
export function getDaysUntilExpiry(expiresAtStr: string): number {
  const now = new Date();
  const expiry = new Date(expiresAtStr);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Normalize Vietnamese phone number (strip whitespace, dots, dashes, convert +84/84 to 0)
 */
export function normalizePhone(phone: string): string {
  let cleaned = (phone || '').replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Validate Vietnamese phone number format
 * Valid formats: 10 digits starting with 0
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const cleaned = normalizePhone(phone);
  const phoneRegex = /^0[1-9][0-9]{8}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Format currency in Vietnamese Dong (VNĐ)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date time in Vietnamese locale
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Chưa có';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Chưa có';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Cấu hình mặc định khi chưa có bản ghi point_settings (dùng chung client + server)
 */
export const DEFAULT_SETTING: PointSetting = {
  id: 'default-setting-01',
  amount_per_point: 10000,
  points_per_amount: 1,
  cash_per_point: 1000,
  rounding_mode: 'FLOOR',
  expiry_days: 90,
  is_active: true,
  updated_by: 'HỆ THỐNG',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  bonus_tiers: [
    { id: 'bt-01', minAmount: 1000000, bonusPoints: 50, label: 'Mốc 1 triệu' },
    { id: 'bt-02', minAmount: 2000000, bonusPoints: 150, label: 'Mốc 2 triệu' },
    { id: 'bt-03', minAmount: 5000000, bonusPoints: 500, label: 'Mốc 5 triệu' },
  ],
};

export function formatTimeOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr));
}
