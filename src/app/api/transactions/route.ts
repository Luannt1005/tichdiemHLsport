import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    if (searchParams.has('page')) {
      const result = await loyaltyStore.getTransactionsPaginated({
        type: searchParams.get('type') || undefined,
        customerId: searchParams.get('customerId') || undefined,
        query: searchParams.get('query') || undefined,
        page: Number(searchParams.get('page')) || 1,
        pageSize: Number(searchParams.get('pageSize')) || 20,
      });
      return NextResponse.json(result);
    }

    const transactions = await loyaltyStore.getTransactions({
      type: searchParams.get('type') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      query: searchParams.get('query') || undefined,
      limit: Number(searchParams.get('limit')) || undefined,
    });
    return NextResponse.json(transactions);
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy danh sách giao dịch', 500);
  }
}
