-- ==============================================================================
-- HL SPORT LOYALTY SYSTEM - AUTHENTICATION & ACTIVITY LOGS SCHEMA
-- ==============================================================================

-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (APP USERS)
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Hash bcrypt ($2a$/$2b$), không bao giờ lưu plaintext
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục tìm kiếm người dùng
CREATE INDEX IF NOT EXISTS idx_app_users_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON public.app_users(role);

-- 2. BẢNG NHẬT KÝ HOẠT ĐỘNG (ACTIVITY LOGS / AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    username VARCHAR(100) NOT NULL,
    user_role VARCHAR(20) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'LOGIN', 'LOGOUT', 'CUSTOMER_CREATE', 'CUSTOMER_UPDATE', 'CUSTOMER_DELETE', 'POINTS_EARN', 'POINTS_REDEEM', 'POINTS_ADJUST', 'SETTINGS_UPDATE', 'EXPIRE_CHECK'
    entity_type VARCHAR(50) NOT NULL, -- 'AUTH', 'CUSTOMER', 'POINT_TRANSACTION', 'POINT_SETTING'
    entity_id VARCHAR(100),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục tối ưu truy vấn logs theo thời gian, người thực hiện và loại hành động
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_username ON public.activity_logs(username);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- 3. ROW LEVEL SECURITY — KHÔNG CÓ POLICY CHO anon / authenticated
-- Ứng dụng chỉ truy cập 2 bảng này qua API route phía server bằng service_role (bỏ qua RLS).
-- Bật RLS mà không tạo policy = từ chối mọi request dùng anon key (công khai trong trình duyệt).
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Gỡ các policy mở toang của phiên bản cũ (nếu còn)
DROP POLICY IF EXISTS "Public full access to app_users" ON public.app_users;
DROP POLICY IF EXISTS "Public full access to activity_logs" ON public.activity_logs;

REVOKE ALL ON public.app_users FROM anon, authenticated;
REVOKE ALL ON public.activity_logs FROM anon, authenticated;
GRANT ALL ON public.app_users TO service_role;
GRANT ALL ON public.activity_logs TO service_role;

-- 4. MẬT KHẨU: CHỈ LƯU HASH BCRYPT
-- pgcrypto trên Supabase nằm trong schema "extensions"
SET search_path = public, extensions;

-- Hash mọi mật khẩu còn ở dạng plaintext (ứng dụng so khớp bằng bcryptjs, tương thích $2a$)
UPDATE public.app_users
SET password_hash = crypt(password_hash, gen_salt('bf', 10)),
    updated_at = NOW()
WHERE password_hash NOT LIKE '$2%';

-- Tài khoản khởi tạo khi bảng còn trống. KHÔNG ghi đè tài khoản đã tồn tại.
-- ⚠️ Thay 'MAT_KHAU_MANH_O_DAY' bằng mật khẩu an toàn trước khi chạy
INSERT INTO public.app_users (username, email, name, password_hash, role, is_active)
VALUES
    ('admin', 'admin@hlsport.vn', 'Quản trị viên HL Sport', crypt('MAT_KHAU_MANH_O_DAY_1', gen_salt('bf', 10)), 'ADMIN', true),
    ('nhanvien', 'nhanvien@hlsport.vn', 'Thu ngân HL Sport', crypt('MAT_KHAU_MANH_O_DAY_2', gen_salt('bf', 10)), 'STAFF', true)
ON CONFLICT (username) DO NOTHING;

RESET search_path;

-- 5. GHI NHẬN LOG KHỞI TẠO HỆ THỐNG
INSERT INTO public.activity_logs (user_id, username, user_role, action, entity_type, entity_id, description, metadata)
VALUES (
    'system',
    'HỆ THỐNG',
    'ADMIN',
    'SETTINGS_UPDATE',
    'AUTH',
    'SYS-INIT',
    'Khởi tạo bảng người dùng và nhật ký hoạt động cho HL Sport',
    '{"version": "1.0", "seeded_users": ["admin", "nhanvien"]}'::jsonb
);
