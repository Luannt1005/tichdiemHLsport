import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST() {
  try {
    const result = await loyaltyStore.checkAndExpireLots();
    return NextResponse.json({
      success: true,
      lotsExpired: result.lotsExpired,
      totalPointsExpired: result.totalPointsExpired,
      message: `Đã xử lý hết hạn ${result.lotsExpired} lô điểm (tổng ${result.totalPointsExpired} điểm)`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi quét kiểm tra điểm hết hạn' },
      { status: 500 }
    );
  }
}
