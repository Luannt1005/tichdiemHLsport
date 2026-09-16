-- ==============================================================================
-- MODULE: TÍCH ĐIỂM KHÁCH HÀNG SÂN CẦU LÔNG (BADMINTON LOYALTY POINTS SYSTEM)
-- Schema: Point Ledger / Point Lots (FEFO Model) & Atomic RPC Functions
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BẢNG CÀI ĐẶT QUY TẮC TÍCH ĐIỂM (POINT SETTINGS)
CREATE TABLE IF NOT EXISTS public.point_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount_per_point NUMERIC(15, 2) NOT NULL DEFAULT 10000.00 CHECK (amount_per_point > 0),
    points_per_amount INTEGER NOT NULL DEFAULT 1 CHECK (points_per_amount > 0),
    rounding_mode VARCHAR(20) NOT NULL DEFAULT 'FLOOR' CHECK (rounding_mode IN ('FLOOR', 'ROUND', 'CEIL')),
    expiry_days INTEGER NOT NULL DEFAULT 90 CHECK (expiry_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by VARCHAR(255) DEFAULT 'ADMIN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tạo bản ghi cấu hình mặc định nếu chưa có
INSERT INTO public.point_settings (amount_per_point, points_per_amount, rounding_mode, expiry_days, is_active, updated_by)
SELECT 10000.00, 1, 'FLOOR', 90, true, 'SYSTEM_INIT'
WHERE NOT EXISTS (SELECT 1 FROM public.point_settings WHERE is_active = true);

-- 3. BẢNG KHÁCH HÀNG (CUSTOMERS)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    lifetime_points_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points_earned >= 0),
    lifetime_points_used INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points_used >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    last_transaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_total_points ON public.customers(total_points);

-- 4. BẢNG GIAO DỊCH ĐIỂM (POINT TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REFUND')),
    points INTEGER NOT NULL,
    amount NUMERIC(15, 2) DEFAULT 0.00,
    reference_type VARCHAR(50) DEFAULT 'MANUAL',
    reference_id VARCHAR(100),
    description TEXT,
    created_by VARCHAR(255) DEFAULT 'STAFF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_customer ON public.point_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON public.point_transactions(type);

-- 5. BẢNG LÔ ĐIỂM (POINT LOTS - QUẢN LÝ THỜI HẠN & VÒNG ĐỜI TỪNG ĐỢT ĐIỂM)
CREATE TABLE IF NOT EXISTS public.point_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    transaction_id UUID NOT NULL REFERENCES public.point_transactions(id) ON DELETE CASCADE,
    original_points INTEGER NOT NULL CHECK (original_points > 0),
    remaining_points INTEGER NOT NULL CHECK (remaining_points >= 0),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULLY_USED', 'EXPIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_point_lots_customer_status ON public.point_lots(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_point_lots_expires_at ON public.point_lots(expires_at ASC);
CREATE INDEX IF NOT EXISTS idx_point_lots_fefo ON public.point_lots(customer_id, status, expires_at ASC) WHERE status = 'ACTIVE' AND remaining_points > 0;

-- 6. BẢNG PHÂN BỔ TRỪ ĐIỂM (POINT REDEMPTION ALLOCATIONS - AUDIT CHI TIẾT TRỪ TỪ LÔ NÀO)
CREATE TABLE IF NOT EXISTS public.point_redemption_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_transaction_id UUID NOT NULL REFERENCES public.point_transactions(id) ON DELETE CASCADE,
    point_lot_id UUID NOT NULL REFERENCES public.point_lots(id) ON DELETE RESTRICT,
    points_used INTEGER NOT NULL CHECK (points_used > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocations_transaction ON public.point_redemption_allocations(redemption_transaction_id);
CREATE INDEX IF NOT EXISTS idx_allocations_lot ON public.point_redemption_allocations(point_lot_id);


-- ==============================================================================
-- 7. ATOMIC PROCEDURES / RPC FUNCTIONS
-- ==============================================================================

-- 7.1. CỘNG ĐIỂM KHI THANH TOÁN TIỀN SÂN (EARN POINTS ATOMIC)
CREATE OR REPLACE FUNCTION public.earn_points_atomic(
    p_phone VARCHAR,
    p_name VARCHAR,
    p_amount NUMERIC,
    p_description TEXT DEFAULT NULL,
    p_reference_type VARCHAR DEFAULT 'BOOKING',
    p_reference_id VARCHAR DEFAULT NULL,
    p_created_by VARCHAR DEFAULT 'STAFF'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_setting RECORD;
    v_calculated_points INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_transaction_id UUID;
    v_lot_id UUID;
    v_new_total INTEGER;
    v_raw_points NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Số tiền thanh toán phải lớn hơn 0';
    END IF;

    -- Lấy cấu hình điểm hiện hành
    SELECT amount_per_point, points_per_amount, rounding_mode, expiry_days
    INTO v_setting
    FROM public.point_settings
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        v_setting.amount_per_point := 10000.00;
        v_setting.points_per_amount := 1;
        v_setting.rounding_mode := 'FLOOR';
        v_setting.expiry_days := 90;
    END IF;

    -- Tính số điểm theo quy tắc làm tròn
    v_raw_points := (p_amount / v_setting.amount_per_point) * v_setting.points_per_amount;
    IF v_setting.rounding_mode = 'CEIL' THEN
        v_calculated_points := CEIL(v_raw_points)::INTEGER;
    ELSIF v_setting.rounding_mode = 'ROUND' THEN
        v_calculated_points := ROUND(v_raw_points)::INTEGER;
    ELSE -- FLOOR
        v_calculated_points := FLOOR(v_raw_points)::INTEGER;
    END IF;

    IF v_calculated_points <= 0 THEN
        v_calculated_points := 1;
    END IF;

    -- Tính ngày hết hạn dựa trên cấu hình tại THỜI ĐIỂM CỘNG (không đổi khi setting đổi sau này)
    v_expires_at := now() + (v_setting.expiry_days || ' days')::INTERVAL;

    -- Khóa hoặc tạo mới khách hàng
    SELECT id INTO v_customer_id
    FROM public.customers
    WHERE phone = p_phone
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.customers (phone, name, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
        VALUES (p_phone, COALESCE(NULLIF(p_name, ''), 'Khách hàng mới'), v_calculated_points, v_calculated_points, 0, now())
        RETURNING id, total_points INTO v_customer_id, v_new_total;
    ELSE
        UPDATE public.customers
        SET total_points = total_points + v_calculated_points,
            lifetime_points_earned = lifetime_points_earned + v_calculated_points,
            name = COALESCE(NULLIF(p_name, ''), name),
            last_transaction_at = now(),
            updated_at = now()
        WHERE id = v_customer_id
        RETURNING total_points INTO v_new_total;
    END IF;

    -- Tạo bản ghi Point Transaction
    INSERT INTO public.point_transactions (
        customer_id, type, points, amount, reference_type, reference_id, description, created_by, created_at
    )
    VALUES (
        v_customer_id, 'EARN', v_calculated_points, p_amount, p_reference_type, p_reference_id,
        COALESCE(p_description, 'Tích điểm thanh toán tiền sân'), p_created_by, now()
    )
    RETURNING id INTO v_transaction_id;

    -- Tạo Point Lot tương ứng
    INSERT INTO public.point_lots (
        customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status
    )
    VALUES (
        v_customer_id, v_transaction_id, v_calculated_points, v_calculated_points, now(), v_expires_at, 'ACTIVE'
    )
    RETURNING id INTO v_lot_id;

    RETURN jsonb_build_object(
        'success', true,
        'customer_id', v_customer_id,
        'transaction_id', v_transaction_id,
        'point_lot_id', v_lot_id,
        'points_earned', v_calculated_points,
        'new_total_points', v_new_total,
        'expires_at', v_expires_at,
        'expiry_days', v_setting.expiry_days
    );
END;
$$;


-- 7.2. SỬ DỤNG ĐIỂM THEO NGUYÊN TẮC FEFO (FIRST EXPIRED, FIRST OUT ATOMIC)
CREATE OR REPLACE FUNCTION public.redeem_points_fefo_atomic(
    p_customer_id UUID,
    p_points_to_redeem INTEGER,
    p_description TEXT DEFAULT NULL,
    p_created_by VARCHAR DEFAULT 'STAFF',
    p_reference_type VARCHAR DEFAULT 'POS_ORDER',
    p_reference_id VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_available_points INTEGER := 0;
    v_points_needed INTEGER;
    v_transaction_id UUID;
    v_lot RECORD;
    v_deduct INTEGER;
    v_allocations JSONB := '[]'::JSONB;
    v_new_balance INTEGER;
BEGIN
    IF p_points_to_redeem <= 0 THEN
        RAISE EXCEPTION 'Số điểm sử dụng phải lớn hơn 0';
    END IF;

    -- Khóa bản ghi khách hàng để ngăn chặn giao dịch đồng thời (race condition)
    SELECT id, name, phone, total_points
    INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy khách hàng với ID %', p_customer_id;
    END IF;

    -- Kiểm tra tổng điểm khả dụng thực tế từ các lô điểm còn hiệu lực
    SELECT COALESCE(SUM(remaining_points), 0)
    INTO v_available_points
    FROM public.point_lots
    WHERE customer_id = p_customer_id
      AND status = 'ACTIVE'
      AND remaining_points > 0
      AND expires_at > now();

    IF v_available_points < p_points_to_redeem THEN
        RAISE EXCEPTION 'Số điểm khả dụng (%) không đủ để sử dụng % điểm (hoặc một số điểm đã hết hạn)',
            v_available_points, p_points_to_redeem;
    END IF;

    -- Tạo Transaction REDEEM (điểm âm)
    INSERT INTO public.point_transactions (
        customer_id, type, points, amount, reference_type, reference_id, description, created_by, created_at
    )
    VALUES (
        p_customer_id, 'REDEEM', -p_points_to_redeem, 0.00, p_reference_type, p_reference_id,
        COALESCE(p_description, 'Sử dụng điểm đổi ưu đãi / giảm giá'), p_created_by, now()
    )
    RETURNING id INTO v_transaction_id;

    -- Duyệt các point lots còn hiệu lực xếp theo thứ tự FEFO (expires_at ASC)
    v_points_needed := p_points_to_redeem;

    FOR v_lot IN
        SELECT id, remaining_points, expires_at
        FROM public.point_lots
        WHERE customer_id = p_customer_id
          AND status = 'ACTIVE'
          AND remaining_points > 0
          AND expires_at > now()
        ORDER BY expires_at ASC
        FOR UPDATE
    LOOP
        v_deduct := LEAST(v_lot.remaining_points, v_points_needed);

        -- Cập nhật lô điểm
        UPDATE public.point_lots
        SET remaining_points = remaining_points - v_deduct,
            status = CASE WHEN remaining_points - v_deduct = 0 THEN 'FULLY_USED' ELSE 'ACTIVE' END,
            updated_at = now()
        WHERE id = v_lot.id;

        -- Ghi nhận allocation
        INSERT INTO public.point_redemption_allocations (
            redemption_transaction_id, point_lot_id, points_used, created_at
        )
        VALUES (
            v_transaction_id, v_lot.id, v_deduct, now()
        );

        v_allocations := v_allocations || jsonb_build_object(
            'lot_id', v_lot.id,
            'points_deducted', v_deduct,
            'lot_expires_at', v_lot.expires_at
        );

        v_points_needed := v_points_needed - v_deduct;

        EXIT WHEN v_points_needed = 0;
    END LOOP;

    -- Cập nhật số dư khách hàng
    UPDATE public.customers
    SET total_points = total_points - p_points_to_redeem,
        lifetime_points_used = lifetime_points_used + p_points_to_redeem,
        last_transaction_at = now(),
        updated_at = now()
    WHERE id = p_customer_id
    RETURNING total_points INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'customer_id', p_customer_id,
        'points_redeemed', p_points_to_redeem,
        'new_total_points', v_new_balance,
        'allocations', v_allocations
    );
END;
$$;


-- 7.3. ĐIỀU CHỈNH ĐIỂM (ADJUST POINTS ATOMIC - ADMIN DÙNG KHI CẦN ĐIỀU CHỈNH)
CREATE OR REPLACE FUNCTION public.adjust_points_atomic(
    p_customer_id UUID,
    p_points_delta INTEGER,
    p_reason TEXT,
    p_created_by VARCHAR DEFAULT 'ADMIN'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_transaction_id UUID;
    v_lot_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_new_balance INTEGER;
BEGIN
    IF p_points_delta = 0 THEN
        RAISE EXCEPTION 'Số điểm điều chỉnh không được bằng 0';
    END IF;

    SELECT id, total_points INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy khách hàng';
    END IF;

    IF p_points_delta < 0 AND v_customer.total_points + p_points_delta < 0 THEN
        RAISE EXCEPTION 'Số điểm điều chỉnh làm số dư khách bị âm (hiện có: %, điều chỉnh: %)',
            v_customer.total_points, p_points_delta;
    END IF;

    -- Tạo transaction ADJUST
    INSERT INTO public.point_transactions (
        customer_id, type, points, amount, reference_type, description, created_by, created_at
    )
    VALUES (
        p_customer_id, 'ADJUST', p_points_delta, 0.00, 'ADJUSTMENT',
        COALESCE(p_reason, 'Admin điều chỉnh số dư điểm'), p_created_by, now()
    )
    RETURNING id INTO v_transaction_id;

    IF p_points_delta > 0 THEN
        v_expires_at := now() + INTERVAL '90 days';
        INSERT INTO public.point_lots (
            customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status
        )
        VALUES (
            p_customer_id, v_transaction_id, p_points_delta, p_points_delta, now(), v_expires_at, 'ACTIVE'
        )
        RETURNING id INTO v_lot_id;
    ELSE
        PERFORM public.redeem_points_fefo_atomic(
            p_customer_id, ABS(p_points_delta), p_reason, p_created_by, 'ADJUSTMENT', v_transaction_id::VARCHAR
        );
    END IF;

    IF p_points_delta > 0 THEN
        UPDATE public.customers
        SET total_points = total_points + p_points_delta,
            lifetime_points_earned = lifetime_points_earned + p_points_delta,
            last_transaction_at = now(),
            updated_at = now()
        WHERE id = p_customer_id
        RETURNING total_points INTO v_new_balance;
    ELSE
        SELECT total_points INTO v_new_balance FROM public.customers WHERE id = p_customer_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'points_delta', p_points_delta,
        'new_total_points', v_new_balance
    );
END;
$$;


-- 7.4. QUÉT VÀ HẾT HẠN ĐIỂM (EXPIRE POINTS ATOMIC)
CREATE OR REPLACE FUNCTION public.expire_points_atomic()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_lot RECORD;
    v_expired_count INTEGER := 0;
    v_total_points_expired INTEGER := 0;
    v_trans_id UUID;
BEGIN
    FOR v_expired_lot IN
        SELECT id, customer_id, remaining_points
        FROM public.point_lots
        WHERE status = 'ACTIVE'
          AND remaining_points > 0
          AND expires_at <= now()
        FOR UPDATE
    LOOP
        UPDATE public.point_lots
        SET status = 'EXPIRED',
            updated_at = now()
        WHERE id = v_expired_lot.id;

        INSERT INTO public.point_transactions (
            customer_id, type, points, amount, reference_type, reference_id, description, created_by, created_at
        )
        VALUES (
            v_expired_lot.customer_id, 'EXPIRE', -v_expired_lot.remaining_points, 0.00,
            'EXPIRATION_BATCH', v_expired_lot.id::VARCHAR, 'Điểm hết hạn tự động', 'SYSTEM', now()
        )
        RETURNING id INTO v_trans_id;

        UPDATE public.customers
        SET total_points = GREATEST(0, total_points - v_expired_lot.remaining_points),
            updated_at = now()
        WHERE id = v_expired_lot.customer_id;

        v_expired_count := v_expired_count + 1;
        v_total_points_expired := v_total_points_expired + v_expired_lot.remaining_points;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'lots_expired_count', v_expired_count,
        'total_points_expired', v_total_points_expired
    );
END;
$$;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_redemption_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow write customers" ON public.customers FOR ALL USING (true);

CREATE POLICY "Allow read point_settings" ON public.point_settings FOR SELECT USING (true);
CREATE POLICY "Allow update point_settings" ON public.point_settings FOR ALL USING (true);

CREATE POLICY "Allow read point_transactions" ON public.point_transactions FOR SELECT USING (true);
CREATE POLICY "Allow write point_transactions" ON public.point_transactions FOR ALL USING (true);

CREATE POLICY "Allow read point_lots" ON public.point_lots FOR SELECT USING (true);
CREATE POLICY "Allow write point_lots" ON public.point_lots FOR ALL USING (true);

CREATE POLICY "Allow read point_redemption_allocations" ON public.point_redemption_allocations FOR SELECT USING (true);
CREATE POLICY "Allow write point_redemption_allocations" ON public.point_redemption_allocations FOR ALL USING (true);
