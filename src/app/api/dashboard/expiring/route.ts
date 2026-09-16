import { NextResponse, type NextRequest } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') ? Number(searchParams.get('days')) : 30;

    const expiringLots = await loyaltyStore.getExpiringLots(days);
    return NextResponse.json(expiringLots);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy danh sách lô điểm sắp hết hạn' },
      { status: 500 }
    );
  }
}
