-- ==============================================================================
-- SEED DATA: 10 KHÁCH HÀNG MẪU VỚI CÁC TÌNH HUỐNG TÍCH ĐIỂM ĐA DẠNG
-- ==============================================================================

DO $$
DECLARE
    v_c1 UUID; v_c2 UUID; v_c3 UUID; v_c4 UUID; v_c5 UUID;
    v_c6 UUID; v_c7 UUID; v_c8 UUID; v_c9 UUID; v_c10 UUID;
    v_t1 UUID; v_t2 UUID; v_t3 UUID; v_t4 UUID; v_t5 UUID;
    v_t6 UUID; v_t7 UUID; v_t8 UUID; v_t9 UUID;
    v_lot1 UUID; v_lot2 UUID; v_lot3 UUID;
BEGIN
    -- 1. Nguyễn Văn An: 1.000 điểm (2 lô: 1 lô 300 điểm còn hạn 30 ngày, 1 lô 700 điểm còn hạn 75 ngày)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0901234567', 'Nguyễn Văn An', 'an.nguyen@example.com', 1000, 1200, 200, now() - INTERVAL '5 days')
    RETURNING id INTO v_c1;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c1, 'EARN', 500, 5000000, 'BOOKING', 'Thanh toán tiền sân tháng 7', 'STAFF_HUY', now() - INTERVAL '60 days')
    RETURNING id INTO v_t1;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c1, v_t1, 500, 300, now() - INTERVAL '60 days', now() + INTERVAL '30 days', 'ACTIVE')
    RETURNING id INTO v_lot1;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c1, 'REDEEM', -200, 0, 'POS_ORDER', 'Đổi nước uống và cầu Yonex', 'STAFF_HUY', now() - INTERVAL '30 days')
    RETURNING id INTO v_t2;

    INSERT INTO public.point_redemption_allocations (redemption_transaction_id, point_lot_id, points_used, created_at)
    VALUES (v_t2, v_lot1, 200, now() - INTERVAL '30 days');

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c1, 'EARN', 700, 7000000, 'BOOKING', 'Thanh toán gói sân cố định quý 3', 'STAFF_HUY', now() - INTERVAL '15 days')
    RETURNING id INTO v_t3;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c1, v_t3, 700, 700, now() - INTERVAL '15 days', now() + INTERVAL '75 days', 'ACTIVE');


    -- 2. Trần Thị Bích: 500 điểm (1 lô 500 điểm, hạn 60 ngày)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0912345678', 'Trần Thị Bích', 'bich.tran@example.com', 500, 500, 0, now() - INTERVAL '30 days')
    RETURNING id INTO v_c2;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c2, 'EARN', 500, 5000000, 'BOOKING', 'Thanh toán sân đôi cuối tuần', 'STAFF_LAN', now() - INTERVAL '30 days')
    RETURNING id INTO v_t4;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c2, v_t4, 500, 500, now() - INTERVAL '30 days', now() + INTERVAL '60 days', 'ACTIVE');


    -- 3. Lê Hoàng Cường: 100 điểm (SẮP HẾT HẠN TRONG 5 NGÀY!)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0923456789', 'Lê Hoàng Cường', 'cuong.le@example.com', 100, 100, 0, now() - INTERVAL '85 days')
    RETURNING id INTO v_c3;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c3, 'EARN', 100, 1000000, 'BOOKING', 'Thuê sân giao lưu CLB', 'STAFF_LAN', now() - INTERVAL '85 days')
    RETURNING id INTO v_t5;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c3, v_t5, 100, 100, now() - INTERVAL '85 days', now() + INTERVAL '5 days', 'ACTIVE');


    -- 4. Phạm Minh Đức: 0 điểm (Khách mới tạo chưa phát sinh giao dịch điểm)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0934567890', 'Phạm Minh Đức', 'duc.pham@example.com', 0, 0, 0, NULL)
    RETURNING id INTO v_c4;


    -- 5. Võ Quốc Hùng: 350 điểm (2 lô: 150 điểm sắp hết hạn trong 10 ngày, 200 điểm còn 80 ngày)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0945678901', 'Võ Quốc Hùng', 'hung.vo@example.com', 350, 350, 0, now() - INTERVAL '10 days')
    RETURNING id INTO v_c5;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c5, 'EARN', 150, 1500000, 'BOOKING', 'Tiền sân thứ 3, 5, 7', 'STAFF_HUY', now() - INTERVAL '80 days')
    RETURNING id INTO v_t6;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c5, v_t6, 150, 150, now() - INTERVAL '80 days', now() + INTERVAL '10 days', 'ACTIVE');

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c5, 'EARN', 200, 2000000, 'BOOKING', 'Tiền sân cuối tuần', 'STAFF_HUY', now() - INTERVAL '10 days')
    RETURNING id INTO v_t7;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c5, v_t7, 200, 200, now() - INTERVAL '10 days', now() + INTERVAL '80 days', 'ACTIVE');


    -- 6. Đặng Thu Hương: 0 điểm (ĐÃ HẾT HẠN - EXPIRED)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0956789012', 'Đặng Thu Hương', 'huong.dang@example.com', 0, 200, 0, now() - INTERVAL '100 days')
    RETURNING id INTO v_c6;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c6, 'EARN', 200, 2000000, 'BOOKING', 'Tiền sân giải nội bộ', 'STAFF_LAN', now() - INTERVAL '100 days')
    RETURNING id INTO v_t8;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c6, v_t8, 200, 200, now() - INTERVAL '100 days', now() - INTERVAL '10 days', 'EXPIRED')
    RETURNING id INTO v_lot2;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, reference_id, description, created_by, created_at)
    VALUES (v_c6, 'EXPIRE', -200, 0, 'EXPIRATION_BATCH', v_lot2::VARCHAR, 'Điểm hết hạn tự động', 'SYSTEM', now() - INTERVAL '10 days');


    -- 7. Bùi Thanh Long: 850 điểm (Thường xuyên giao lưu, có hoàn điểm REFUND và điều chỉnh ADJUST)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0967890123', 'Bùi Thanh Long', 'long.bui@example.com', 850, 1000, 150, now() - INTERVAL '2 days')
    RETURNING id INTO v_c7;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c7, 'EARN', 800, 8000000, 'BOOKING', 'Đăng ký vé tháng sân 1', 'STAFF_HUY', now() - INTERVAL '40 days')
    RETURNING id INTO v_t9;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c7, v_t9, 800, 650, now() - INTERVAL '40 days', now() + INTERVAL '50 days', 'ACTIVE')
    RETURNING id INTO v_lot3;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c7, 'REDEEM', -150, 0, 'POS_ORDER', 'Trừ điểm thanh toán nước tăng lực', 'STAFF_HUY', now() - INTERVAL '20 days');

    INSERT INTO public.point_redemption_allocations (redemption_transaction_id, point_lot_id, points_used, created_at)
    VALUES (v_t9, v_lot3, 150, now() - INTERVAL '20 days');

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c7, 'REFUND', 50, 0, 'REFUND', 'Hoàn điểm do huỷ giờ sân mưa bão', 'ADMIN', now() - INTERVAL '10 days');

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c7, v_t9, 50, 50, now() - INTERVAL '10 days', now() + INTERVAL '80 days', 'ACTIVE');

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c7, 'ADJUST', 150, 0, 'ADJUSTMENT', 'Thưởng điểm hội viên tích cực', 'ADMIN', now() - INTERVAL '2 days');

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c7, v_t9, 150, 150, now() - INTERVAL '2 days', now() + INTERVAL '88 days', 'ACTIVE');


    -- 8. Đỗ Mỹ Linh: 200 điểm (Hạn còn 25 ngày)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0978901234', 'Đỗ Mỹ Linh', 'linh.do@example.com', 200, 200, 0, now() - INTERVAL '65 days')
    RETURNING id INTO v_c8;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c8, 'EARN', 200, 2000000, 'BOOKING', 'Tiền sân lớp năng khiếu', 'STAFF_LAN', now() - INTERVAL '65 days')
    RETURNING id INTO v_t1;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c8, v_t1, 200, 200, now() - INTERVAL '65 days', now() + INTERVAL '25 days', 'ACTIVE');


    -- 9. Ngô Gia Bảo: 600 điểm (Thành viên VIP)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0989012345', 'Ngô Gia Bảo', 'bao.ngo@example.com', 600, 600, 0, now() - INTERVAL '18 days')
    RETURNING id INTO v_c9;

    INSERT INTO public.point_transactions (customer_id, type, points, amount, reference_type, description, created_by, created_at)
    VALUES (v_c9, 'EARN', 600, 6000000, 'BOOKING', 'Thuê sân giải phong trào', 'STAFF_HUY', now() - INTERVAL '18 days')
    RETURNING id INTO v_t1;

    INSERT INTO public.point_lots (customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status)
    VALUES (v_c9, v_t1, 600, 600, now() - INTERVAL '18 days', now() + INTERVAL '72 days', 'ACTIVE');


    -- 10. Hoàng Yến Nhi: 0 điểm (Khách mới)
    INSERT INTO public.customers (phone, name, email, total_points, lifetime_points_earned, lifetime_points_used, last_transaction_at)
    VALUES ('0990123456', 'Hoàng Yến Nhi', 'nhi.hoang@example.com', 0, 0, 0, NULL)
    RETURNING id INTO v_c10;

END $$;
