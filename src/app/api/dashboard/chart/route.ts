import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { ChartPeriod } from '@/types/database';

const PERIODS: ChartPeriod[] = ['7d', '30d', '12m'];

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const period = PERIODS.find((p) => p === request.nextUrl.searchParams.get('period')) ?? '7d';
    return NextResponse.json(await loyaltyStore.getChartData(period));
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy dữ liệu biểu đồ', 500);
  }
}
