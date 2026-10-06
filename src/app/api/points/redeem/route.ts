import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    const customerId = optionalString(body.customerId);
    if (!customerId) {
      return NextResponse.json({ error: 'Mã khách hàng (customerId) là bắt buộc' }, { status: 400 });
    }

    const result = await loyaltyStore.redeemPoints(auth.user, {
      customerId,
      points: Number(body.points),
      description: optionalString(body.description),
      referenceType: optionalString(body.referenceType),
      referenceId: optionalString(body.referenceId),
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Lỗi xử lý trừ điểm FEFO');
  }
}
