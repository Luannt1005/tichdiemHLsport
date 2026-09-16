import { RoundingMode } from '@/types/database';

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
 * Validate Vietnamese phone number format
 * Valid formats: 10 digits starting with 03, 05, 07, 08, 09
 */
export function isValidVietnamesePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '');
  const phoneRegex = /^(0)(3|5|7|8|9)[0-9]{8}$/;
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
