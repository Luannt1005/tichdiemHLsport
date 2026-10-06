import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { CustomerFilter } from '@/types/database';

const FILTERS: CustomerFilter[] = ['ALL', 'HAS_POINTS', 'NO_POINTS', 'EXPIRING_SOON', 'EXPIRED'];

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { searchParams } = request.nextUrl;
    const filter = FILTERS.find((f) => f === searchParams.get('filter')) ?? 'ALL';
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const pageSize = searchParams.get('pageSize') ? Number(searchParams.get('pageSize')) : 20;
    const customers = await loyaltyStore.getCustomers(
      searchParams.get('search') || '',
      filter,
      page,
      pageSize
    );
    return NextResponse.json(customers);
  } catch (err) {
    return errorResponse(err, 'Lỗi lấy danh sách khách hàng', 500);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const body = await readJsonBody(request);
    const customer = await loyaltyStore.createCustomer(
      auth.user,
      optionalString(body.phone) || '',
      optionalString(body.name) || '',
      optionalString(body.email)
    );
    return NextResponse.json(customer, { status: 201 });
  } catch (err) {
    return errorResponse(err, 'Lỗi tạo khách hàng');
  }
}
