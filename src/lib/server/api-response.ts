import 'server-only';

import { NextResponse } from 'next/server';

export function errorResponse(err: unknown, fallback: string, status = 400): NextResponse {
  const message = err instanceof Error && err.message ? err.message : fallback;
  if (status >= 500) console.error(fallback, err);
  return NextResponse.json({ error: message }, { status });
}

/** Đọc body JSON dạng object; body sai định dạng → ném lỗi để route trả 400 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // rơi xuống lỗi chung bên dưới
  }
  throw new Error('Dữ liệu gửi lên không hợp lệ');
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
