import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { userService } from '@/lib/auth/user-service';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { activityLogService } from '@/lib/services/activity-log-service';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    return NextResponse.json(await userService.listUsers());
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy danh sách tài khoản', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    const user = await userService.createUser(
      {
        username: optionalString(body.username) || '',
        name: optionalString(body.name) || '',
        email: optionalString(body.email),
        password: optionalString(body.password) || '',
        role: body.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
      },
      { isActive: true }
    );

    await activityLogService.logActivity(
      auth.user,
      'USER_REGISTER',
      'AUTH',
      user.id,
      `Quản trị viên tạo tài khoản mới: ${user.name} (@${user.username}) với vai trò ${user.role}`,
      { targetUsername: user.username, role: user.role }
    );
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return errorResponse(err, 'Không thể tạo tài khoản');
  }
}
