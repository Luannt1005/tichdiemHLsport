import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET() {
  try {
    const stats = await loyaltyStore.getDashboardStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy thống kê KPI' },
      { status: 500 }
    );
  }
}
