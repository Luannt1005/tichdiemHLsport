import { NextResponse, type NextRequest } from 'next/server';
import { userService } from '@/lib/auth/user-service';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { getClientIp, isRateLimited } from '@/lib/server/rate-limit';
import { activityLogService } from '@/lib/services/activity-log-service';

/**
 * Đăng ký công khai: luôn tạo tài khoản STAFF ở trạng thái CHỜ DUYỆT (is_active = false).
 * Chỉ ADMIN mới kích hoạt được tại trang Quản trị — người lạ không thể tự cấp quyền.
 */
export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(`register:${getClientIp(request)}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau.' }, { status: 429 });
    }

    const body = await readJsonBody(request);
    const user = await userService.createUser(
      {
        username: optionalString(body.username) || '',
        name: optionalString(body.name) || '',
        email: optionalString(body.email),
        password: optionalString(body.password) || '',
        role: 'STAFF',
      },
      { isActive: false }
    );

    await activityLogService.logActivity(
      user,
      'USER_REGISTER',
      'AUTH',
      user.id,
      `Đăng ký tài khoản mới (chờ duyệt): ${user.name} (@${user.username})`,
      { username: user.username, name: user.name }
    );

    return NextResponse.json({ user, pendingApproval: true }, { status: 201 });
  } catch (err) {
    return errorResponse(err, 'Không thể tạo tài khoản');
  }
}
