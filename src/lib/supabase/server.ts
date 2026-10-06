import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Supabase client dùng service role — bỏ qua RLS, CHỈ được dùng ở server (API route).
 * null khi chưa cấu hình → hệ thống chạy chế độ demo in-memory (chỉ cho môi trường dev).
 */
export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

/**
 * Trả về client nếu đã cấu hình. Ở production bắt buộc phải có cấu hình,
 * tránh việc ghi dữ liệu thật vào bộ nhớ tạm rồi mất khi server khởi động lại.
 */
export function getDatabase(): SupabaseClient | null {
  if (!supabaseAdmin && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY trên server'
    );
  }
  return supabaseAdmin;
}
