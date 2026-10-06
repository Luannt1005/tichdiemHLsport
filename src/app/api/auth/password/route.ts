import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { userService } from '@/lib/auth/user-service';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { activityLogService } from '@/lib/services/activity-log-service';

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    await userService.changeOwnPassword(
      auth.user.id,
      optionalString(body.oldPassword) || '',
      optionalString(body.newPassword) || ''
    );

    await activityLogService.logActivity(
      auth.user,
      'USER_RESET_PASSWORD',
      'AUTH',
      auth.user.id,
      `Người dùng ${auth.user.name} (@${auth.user.username}) đã tự đổi mật khẩu tài khoản`,
      { username: auth.user.username }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'Không thể đổi mật khẩu');
  }
}
