import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  return NextResponse.json({ user: auth.user });
}
