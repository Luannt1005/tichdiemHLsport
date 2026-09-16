import { NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET() {
  try {
    const settings = await loyaltyStore.getPointSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi lấy cấu hình quy tắc' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updated = await loyaltyStore.updatePointSettings(body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Lỗi cập nhật cấu hình quy tắc' },
      { status: 400 }
    );
  }
}
