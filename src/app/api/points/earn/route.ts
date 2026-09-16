import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, amount, name, description, referenceType, referenceId, createdBy } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { error: 'Số điện thoại khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'Số tiền thanh toán phải lớn hơn 0' },
        { status: 400 }
      );
    }

    const result = await loyaltyStore.earnPoints({
      phone: phone.trim(),
      amount: numAmount,
      name: name?.trim(),
      description: description?.trim(),
      referenceType,
      referenceId,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      newTotalPoints: result.customer.total_points,
      customer: result.customer,
      transaction: result.transaction,
      lot: result.lot,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý cộng điểm' },
      { status: 500 }
    );
  }
}
