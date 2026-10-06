import 'server-only';

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { userService } from '@/lib/auth/user-service';
import { AppUser, UserRole } from '@/types/database';

export const SESSION_COOKIE = 'hl_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 giờ

interface SessionPayload {
  uid: string;
  exp: number;
}

const devFallbackSecret = randomBytes(32);

function getSigningKey(): Buffer {
  const explicit = process.env.SESSION_SECRET;
  if (explicit && explicit.length >= 32) return Buffer.from(explicit);

  // Dẫn xuất khóa riêng từ service role key (vốn chỉ có ở server) khi chưa đặt SESSION_SECRET
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return createHmac('sha256', serviceRoleKey).update('hl-session-v1').digest();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Thiếu SESSION_SECRET (≥ 32 ký tự) trên server');
  }
  return devFallbackSecret;
}

function sign(data: string): string {
  return createHmac('sha256', getSigningKey()).update(data).digest('base64url');
}

function createToken(userId: string): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function verifyToken(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (typeof payload.uid !== 'string' || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, userId: string): void {
  response.cookies.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Đọc session và tải lại user từ DB để role / trạng thái khóa luôn mới nhất */
export async function getSessionUser(request: NextRequest): Promise<AppUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return userService.getActiveUserById(payload.uid);
}

type AuthResult = { user: AppUser; response?: undefined } | { user?: undefined; response: NextResponse };

/**
 * Dùng ở đầu mọi API route cần đăng nhập:
 *   const auth = await requireUser(request, ['ADMIN']);
 *   if (auth.response) return auth.response;
 */
export async function requireUser(request: NextRequest, roles?: UserRole[]): Promise<AuthResult> {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' },
        { status: 401 }
      ),
    };
  }
  if (roles && !roles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { error: 'Bạn không có quyền thực hiện thao tác này' },
        { status: 403 }
      ),
    };
  }
  return { user };
}
