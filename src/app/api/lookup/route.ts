import { NextRequest, NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại để tra cứu' },
        { status: 400 }
      );
    }

    const cleaned = phone.replace(/[\s.-]/g, '');

    // 1. Lấy thông tin khách hàng
    const customer = await loyaltyStore.getCustomerByPhone(cleaned);
    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy khách hàng với số điện thoại ${phone}. Vui lòng kiểm tra lại hoặc liên hệ thu ngân sân để đăng ký.`,
        },
        { status: 404 }
      );
    }

    // 2. Lấy các lô điểm đang còn hạn sử dụng
    const lots = await loyaltyStore.getCustomerLots(customer.id);
    const activeLots = lots.filter(
      (l) => l.status === 'ACTIVE' && l.remaining_points > 0
    );

    // 3. Lấy lịch sử biến động điểm gần nhất
    const transactions = await loyaltyStore.getTransactions({
      customerId: customer.id,
      limit: 15,
    });

    // 4. Lấy cấu hình điểm hiện hành để tính giá trị tiền tệ tương đương
    const settings = await loyaltyStore.getPointSettings();
    const cashValue = Math.floor(
      customer.total_points * (settings.amount_per_point / settings.points_per_amount)
    );

    return NextResponse.json({
      success: true,
      customer,
      lots: activeLots,
      transactions,
      settings: {
        amount_per_point: settings.amount_per_point,
        points_per_amount: settings.points_per_amount,
        expiry_days: settings.expiry_days,
      },
      cash_value: cashValue,
    });
  } catch (error: any) {
    console.error('Error in lookup API:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Lỗi xử lý tra cứu điểm' },
      { status: 500 }
    );
  }
}
