-- ==============================================================================
-- HL SPORT LOYALTY SYSTEM - AUTHENTICATION & ACTIVITY LOGS SCHEMA
-- ==============================================================================

-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (APP USERS)
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Mật khẩu băm hoặc chuỗi kiểm tra
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

-- 3. KÍCH HOẠT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH TRUY CẬP CÔNG KHAI CHO HỆ THỐNG NỘI BỘ
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Cho phép ứng dụng đọc và ghi danh mục người dùng và logs
DROP POLICY IF EXISTS "Public full access to app_users" ON public.app_users;
CREATE POLICY "Public full access to app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to activity_logs" ON public.activity_logs;
CREATE POLICY "Public full access to activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. THÊM TÀI KHOẢN ADMIN VÀ THU NGÂN ĐỊNH SẴN NẾU CHƯA CÓ
INSERT INTO public.app_users (username, email, name, password_hash, role, is_active)
VALUES 
    ('admin', 'admin@hlsport.vn', 'Quản trị viên HL Sport', 'admin123', 'ADMIN', true),
    ('nhanvien', 'nhanvien@hlsport.vn', 'Thu ngân HL Sport', 'staff123', 'STAFF', true)
ON CONFLICT (username) DO UPDATE 
SET name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

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
