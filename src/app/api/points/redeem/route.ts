import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, points, description, referenceType, referenceId, createdBy } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Mã khách hàng (customerId) là bắt buộc' },
        { status: 400 }
      );
    }

    const numPoints = Number(points);
    if (isNaN(numPoints) || numPoints <= 0) {
      return NextResponse.json(
        { error: 'Số điểm sử dụng phải lớn hơn 0' },
        { status: 400 }
      );
    }

    const result = await loyaltyStore.redeemPoints({
      customerId,
      points: numPoints,
      description: description?.trim(),
      referenceType,
      referenceId,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      pointsRedeemed: numPoints,
      newTotalPoints: result.newBalance,
      customer: result.customer,
      transaction: result.transaction,
      allocations: result.allocations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý trừ điểm FEFO' },
      { status: 400 }
    );
  }
}
