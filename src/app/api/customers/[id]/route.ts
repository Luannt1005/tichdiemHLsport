import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await loyaltyStore.getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { error: `Không tìm thấy khách hàng với ID ${id}` },
        { status: 404 }
      );
    }

    const lots = await loyaltyStore.getCustomerLots(id);
    const transactions = await loyaltyStore.getTransactions({ customerId: id });

    return NextResponse.json({
      ...customer,
      lots,
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi tra cứu khách hàng' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email } = body;

    const customer = await loyaltyStore.getCustomerById(id);
    if (!customer) {
      return NextResponse.json(
        { error: `Không tìm thấy khách hàng với ID ${id}` },
        { status: 404 }
      );
    }

    const updated = await loyaltyStore.updateCustomer(id, name || customer.name, email);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi cập nhật khách hàng' },
      { status: 400 }
    );
  }
}
