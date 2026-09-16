import { NextResponse, type NextRequest } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;

    const customers = await loyaltyStore.getCustomers(search);
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy danh sách khách hàng' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, name, email } = body;

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json(
        { error: 'Số điện thoại là bắt buộc' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Họ tên khách hàng là bắt buộc' },
        { status: 400 }
      );
    }

    const customer = await loyaltyStore.createCustomer(phone.trim(), name.trim(), email?.trim());
    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi tạo khách hàng' },
      { status: 400 }
    );
  }
}
