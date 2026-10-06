import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, readJsonBody } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { PointSettingUpdate } from '@/types/database';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await loyaltyStore.getPointSettings());
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy cấu hình quy tắc', 500);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    // Chỉ nhận các trường được phép sửa — bỏ qua id, is_active, updated_by... gửi từ client
    const update: PointSettingUpdate = {
      amount_per_point: body.amount_per_point as number | undefined,
      points_per_amount: body.points_per_amount as number | undefined,
      cash_per_point: body.cash_per_point as number | undefined,
      expiry_days: body.expiry_days as number | undefined,
      bonus_tiers: body.bonus_tiers as PointSettingUpdate['bonus_tiers'],
    };
    return NextResponse.json(await loyaltyStore.updatePointSettings(auth.user, update));
  } catch (err) {
    return errorResponse(err, 'Lỗi cập nhật cấu hình quy tắc');
  }
}
