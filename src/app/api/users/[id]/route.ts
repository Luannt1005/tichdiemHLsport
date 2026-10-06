import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { userService } from '@/lib/auth/user-service';
import { errorResponse, readJsonBody } from '@/lib/server/api-response';
import { activityLogService } from '@/lib/services/activity-log-service';

/** Một request chỉ đổi MỘT thứ: role | is_active | password */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);

    if (body.role === 'ADMIN' || body.role === 'STAFF') {
      const user = await userService.updateRole(id, body.role);
      await activityLogService.logActivity(
        auth.user,
        'USER_UPDATE_ROLE',
        'AUTH',
        id,
        `Quản trị viên đã đổi vai trò của ${user.name} (@${user.username}) sang ${body.role}`,
        { targetUsername: user.username, newRole: body.role }
      );
      return NextResponse.json({ user });
    }

    if (typeof body.is_active === 'boolean') {
      const user = await userService.setActive(auth.user.id, id, body.is_active);
      const actionText = body.is_active ? 'mở khóa' : 'khóa';
      await activityLogService.logActivity(
        auth.user,
        'USER_STATUS_CHANGE',
        'AUTH',
        id,
        `Quản trị viên đã ${actionText} tài khoản ${user.name} (@${user.username})`,
        { targetUsername: user.username, isActive: body.is_active }
      );
      return NextResponse.json({ user });
    }

    if (typeof body.password === 'string') {
      const user = await userService.resetPassword(id, body.password);
      await activityLogService.logActivity(
        auth.user,
        'USER_RESET_PASSWORD',
        'AUTH',
        id,
        `Quản trị viên đã đặt lại mật khẩu cho tài khoản ${user.name} (@${user.username})`,
        { targetUsername: user.username }
      );
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'Không có thay đổi hợp lệ' }, { status: 400 });
  } catch (err) {
    return errorResponse(err, 'Không thể cập nhật tài khoản');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const user = await userService.deleteUser(auth.user.id, id);
    await activityLogService.logActivity(
      auth.user,
      'USER_DELETE',
      'AUTH',
      id,
      `Quản trị viên đã xóa tài khoản ${user.name} (@${user.username}) khỏi hệ thống`,
      { targetUsername: user.username, role: user.role }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 'Không thể xóa tài khoản');
  }
}
