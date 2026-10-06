import { NextResponse, type NextRequest } from 'next/server';
import { setSessionCookie } from '@/lib/auth/session';
import { userService } from '@/lib/auth/user-service';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { getClientIp, isRateLimited } from '@/lib/server/rate-limit';
import { activityLogService } from '@/lib/services/activity-log-service';

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await readJsonBody(request);
    const username = optionalString(body.username)?.trim().toLowerCase() || '';
    const password = optionalString(body.password) || '';
    const ip = getClientIp(request);

    if (isRateLimited(`login-ip:${ip}`, 30, WINDOW_MS) || isRateLimited(`login-user:${username}`, 10, WINDOW_MS)) {
      return NextResponse.json(
        { error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' },
        { status: 429 }
      );
    }

    const result = await userService.login(username, password);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const { user } = result;
    await activityLogService.logActivity(
      user,
      'LOGIN',
      'AUTH',
      user.id,
      `Đăng nhập thành công với tài khoản ${user.name} (${user.role === 'ADMIN' ? 'Quản trị viên' : 'Thu ngân'})`,
      { role: user.role, username: user.username, ip }
    );

    const response = NextResponse.json({ user });
    setSessionCookie(response, user.id);
    return response;
  } catch (err) {
    return errorResponse(err, 'Có lỗi xảy ra khi đăng nhập', 500);
  }
}
