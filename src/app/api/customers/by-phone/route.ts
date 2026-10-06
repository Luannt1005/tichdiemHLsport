import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

/** Tìm chính xác theo SĐT cho màn POS; không tìm thấy → { customer: null } */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const customer = await loyaltyStore.getCustomerByPhone(request.nextUrl.searchParams.get('phone') || '');
    return NextResponse.json({ customer });
  } catch (err) {
    return errorResponse(err, 'Lỗi tra cứu khách hàng', 500);
  }
}
