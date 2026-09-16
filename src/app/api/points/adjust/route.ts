import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, pointsDelta, reason, createdBy } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Mã khách hàng (customerId) là bắt buộc' },
        { status: 400 }
      );
    }

    const numDelta = Number(pointsDelta);
    if (isNaN(numDelta) || numDelta === 0) {
      return NextResponse.json(
        { error: 'Số điểm điều chỉnh phải khác 0' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Lý do điều chỉnh điểm là bắt buộc (Audit log)' },
        { status: 400 }
      );
    }

    const result = await loyaltyStore.adjustPoints({
      customerId,
      pointsDelta: numDelta,
      reason: reason.trim(),
      createdBy,
    });

    return NextResponse.json({
      success: true,
      pointsDelta: numDelta,
      newTotalPoints: result.customer.total_points,
      customer: result.customer,
      transaction: result.transaction,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý điều chỉnh điểm' },
      { status: 400 }
    );
  }
}
