import { NextResponse, type NextRequest } from 'next/server';
import { clearSessionCookie, getSessionUser } from '@/lib/auth/session';
import { activityLogService } from '@/lib/services/activity-log-service';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request).catch(() => null);
  if (user) {
    await activityLogService.logActivity(
      user,
      'LOGOUT',
      'AUTH',
      user.id,
      `Tài khoản ${user.name} (@${user.username}) đã đăng xuất khỏi hệ thống`,
      { username: user.username, role: user.role }
    );
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
