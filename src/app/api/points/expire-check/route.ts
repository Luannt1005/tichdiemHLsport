import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await loyaltyStore.checkAndExpireLots(auth.user));
  } catch (err) {
    return errorResponse(err, 'Lỗi quét kiểm tra điểm hết hạn', 500);
  }
}
