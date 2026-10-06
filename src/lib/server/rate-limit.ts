import 'server-only';

import type { NextRequest } from 'next/server';

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Giới hạn số request theo key trong một cửa sổ thời gian (in-memory, theo từng instance server).
 * Đủ để chặn brute-force / dò số điện thoại đơn giản; cần Redis/Upstash nếu chạy nhiều instance.
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
