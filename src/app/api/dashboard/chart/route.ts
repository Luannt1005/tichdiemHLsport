import { NextResponse, type NextRequest } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as '7d' | '30d' | '12m') || '7d';

    const chartData = await loyaltyStore.getChartData(period);
    return NextResponse.json(chartData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy dữ liệu biểu đồ' },
      { status: 500 }
    );
  }
}
