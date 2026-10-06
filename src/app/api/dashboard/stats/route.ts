import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await loyaltyStore.getDashboardStats());
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy thống kê KPI', 500);
  }
}
