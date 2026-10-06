import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    const phone = optionalString(body.phone);
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Số điện thoại khách hàng là bắt buộc' }, { status: 400 });
    }

    const result = await loyaltyStore.earnPoints(auth.user, {
      phone,
      amount: Number(body.amount),
      name: optionalString(body.name),
      description: optionalString(body.description),
      referenceType: optionalString(body.referenceType),
      referenceId: optionalString(body.referenceId),
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Lỗi xử lý cộng điểm');
  }
}
