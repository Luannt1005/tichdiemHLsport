import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { errorResponse, optionalString, readJsonBody } from '@/lib/server/api-response';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { CustomerDetail } from '@/types/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    // Chạy song song cả 3 query (1 vòng chờ DB thay vì 2)
    const [customer, lots, transactions] = await Promise.all([
      loyaltyStore.getCustomerById(id),
      loyaltyStore.getCustomerLots(id),
      loyaltyStore.getTransactions({ customerId: id }),
    ]);
    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy khách hàng' }, { status: 404 });
    }
    const detail: CustomerDetail = { ...customer, lots, transactions };
    return NextResponse.json(detail);
  } catch (err) {
    return errorResponse(err, 'Lỗi tra cứu khách hàng', 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await readJsonBody(request);
    const updated = await loyaltyStore.updateCustomer(auth.user, id, {
      name: optionalString(body.name),
      email: body.email === null ? null : optionalString(body.email),
      phone: optionalString(body.phone),
    });
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err, 'Lỗi cập nhật khách hàng');
  }
}

/** Xóa khách hàng kéo theo toàn bộ lịch sử điểm → chỉ ADMIN */
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request, ['ADMIN']);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const customer = await loyaltyStore.deleteCustomer(auth.user, id);
    return NextResponse.json({ success: true, message: `Đã xóa khách hàng ${customer.name} thành công` });
  } catch (err) {
    return errorResponse(err, 'Lỗi khi xóa khách hàng');
  }
}
