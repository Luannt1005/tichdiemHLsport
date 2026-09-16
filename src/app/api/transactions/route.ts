import { NextResponse, type NextRequest } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const customerId = searchParams.get('customerId') || undefined;
    const query = searchParams.get('query') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;

    const transactions = await loyaltyStore.getTransactions({
      type,
      customerId,
      query,
      limit,
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy danh sách giao dịch' },
      { status: 500 }
    );
  }
}
