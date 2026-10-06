import { NextResponse, type NextRequest } from 'next/server';
import { errorResponse } from '@/lib/server/api-response';
import { getClientIp, isRateLimited } from '@/lib/server/rate-limit';
import { loyaltyStore } from '@/lib/store/loyalty-store';

/** API công khai cho khách tự tra cứu điểm — chỉ trả dữ liệu tối thiểu, có giới hạn tần suất */
export async function GET(request: NextRequest) {
  if (isRateLimited(`lookup:${getClientIp(request)}`, 20, 60 * 1000)) {
    return NextResponse.json(
      { success: false, message: 'Bạn tra cứu quá nhanh, vui lòng thử lại sau ít phút.' },
      { status: 429 }
    );
  }

  try {
    const phone = request.nextUrl.searchParams.get('phone')?.trim();
    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại để tra cứu' },
        { status: 400 }
      );
    }

    const result = await loyaltyStore.getPublicLookup(phone);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: `Không tìm thấy khách hàng với số điện thoại ${phone}. Vui lòng kiểm tra lại hoặc liên hệ thu ngân sân để đăng ký.`,
        },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Lỗi xử lý tra cứu điểm', 500);
  }
}
