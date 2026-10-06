import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { activityLogService } from '@/lib/services/activity-log-service';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const result = await activityLogService.getActivityLogs({
      action: searchParams.get('action') || undefined,
      role: searchParams.get('role') || undefined,
      search: searchParams.get('search') || undefined,
      limit: Number(searchParams.get('limit')) || undefined,
      offset: Number(searchParams.get('offset')) || undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy nhật ký hoạt động', 500);
  }
}
