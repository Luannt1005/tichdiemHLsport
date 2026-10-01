---
name: hlsport-database-schema
description: >
  Schema chi tiết của Supabase database cho HL Sport Loyalty System.
  Bao gồm: cấu trúc bảng, RPC functions, RLS policies, và hướng dẫn
  thực thi truy vấn. Đọc khi cần thêm bảng, cột, hoặc RPC mới.
---

# HL Sport – Database Schema

## Supabase Project
```
URL:  https://dzemhqkvccmpoaumoytf.supabase.co
Env:  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

---

## Tables

### `public.point_settings` — Cấu hình tích điểm
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
amount_per_point NUMERIC(15,2) NOT NULL DEFAULT 10000.00  -- Số tiền cần để được 1 lần points_per_amount
points_per_amount INTEGER NOT NULL DEFAULT 1              -- Điểm được cộng mỗi amount_per_point
rounding_mode   VARCHAR(20) DEFAULT 'FLOOR'               -- 'FLOOR' | 'ROUND' | 'CEIL'
expiry_days     INTEGER DEFAULT 90                        -- Số ngày trước khi điểm hết hạn
is_active       BOOLEAN DEFAULT true                      -- Chỉ 1 row active tại một thời điểm
updated_by      VARCHAR(255) DEFAULT 'ADMIN'
created_at, updated_at  TIMESTAMPTZ

-- Công thức tính điểm:
-- raw = (amount / amount_per_point) * points_per_amount
-- final = max(1, FLOOR/ROUND/CEIL(raw))
```

### `public.customers` — Khách hàng
```sql
id              UUID PRIMARY KEY
phone           VARCHAR(20) UNIQUE NOT NULL               -- SĐT đã normalize (0XXXXXXXXX)
name            VARCHAR(255) NOT NULL
email           VARCHAR(255) NULL
total_points    INTEGER DEFAULT 0 CHECK >= 0              -- Điểm còn hiệu lực HIỆN TẠI
lifetime_points_earned INTEGER DEFAULT 0                  -- Tổng cộng tất cả điểm từng có
lifetime_points_used   INTEGER DEFAULT 0                  -- Tổng điểm đã dùng
status          VARCHAR(50) DEFAULT 'ACTIVE'              -- 'ACTIVE' | 'INACTIVE'
last_transaction_at TIMESTAMPTZ NULL
created_at, updated_at TIMESTAMPTZ

INDEX: idx_customers_phone, idx_customers_total_points
```

### `public.point_transactions` — Giao dịch điểm
```sql
id              UUID PRIMARY KEY
customer_id     UUID REFERENCES customers(id) ON DELETE RESTRICT
type            VARCHAR(20) NOT NULL                      -- 'EARN'|'REDEEM'|'EXPIRE'|'ADJUST'|'REFUND'
points          INTEGER NOT NULL                          -- Dương nếu cộng, âm nếu trừ
amount          NUMERIC(15,2) DEFAULT 0.00                -- Số tiền liên quan (chỉ EARN mới có)
reference_type  VARCHAR(50) DEFAULT 'MANUAL'              -- 'BOOKING'|'POS_ORDER'|'ADJUSTMENT'|'EXPIRATION_BATCH'|'REFUND'
reference_id    VARCHAR(100) NULL                         -- Mã hóa đơn/đặt sân
description     TEXT NULL
created_by      VARCHAR(255) DEFAULT 'STAFF'
created_at      TIMESTAMPTZ

INDEX: idx_point_transactions_customer, idx_point_transactions_created_at DESC, idx_point_transactions_type
```

### `public.point_lots` — Lô điểm (FEFO tracking)
```sql
id              UUID PRIMARY KEY
customer_id     UUID REFERENCES customers(id) ON DELETE RESTRICT
transaction_id  UUID REFERENCES point_transactions(id) ON DELETE CASCADE
original_points INTEGER CHECK > 0                        -- Điểm ban đầu khi cộng
remaining_points INTEGER CHECK >= 0                      -- Điểm còn lại (giảm dần khi dùng)
earned_at       TIMESTAMPTZ DEFAULT now()
expires_at      TIMESTAMPTZ NOT NULL                     -- Được tính tại thời điểm earn (không đổi theo setting)
status          VARCHAR(20) DEFAULT 'ACTIVE'             -- 'ACTIVE'|'FULLY_USED'|'EXPIRED'
created_at, updated_at TIMESTAMPTZ

INDEX: idx_point_lots_customer_status, idx_point_lots_expires_at ASC
INDEX: idx_point_lots_fefo (customer_id, status, expires_at ASC) WHERE status='ACTIVE' AND remaining_points>0
```

### `public.point_redemption_allocations` — Phân bổ trừ điểm (Audit trail)
```sql
id                        UUID PRIMARY KEY
redemption_transaction_id UUID REFERENCES point_transactions(id) ON DELETE CASCADE
point_lot_id              UUID REFERENCES point_lots(id) ON DELETE RESTRICT
points_used               INTEGER CHECK > 0
created_at                TIMESTAMPTZ
```

### `public.app_users` — Người dùng hệ thống (custom auth)
```sql
id              UUID PRIMARY KEY
username        VARCHAR(255) UNIQUE NOT NULL
email           VARCHAR(255) NULL
name            VARCHAR(255) NOT NULL
role            VARCHAR(20) DEFAULT 'STAFF'              -- 'ADMIN' | 'STAFF'
password_hash   TEXT NOT NULL                            -- Lưu plaintext (TODO: hash thực)
is_active       BOOLEAN DEFAULT true
last_login_at   TIMESTAMPTZ NULL
created_at, updated_at TIMESTAMPTZ
```

### `public.activity_logs` — Nhật ký hoạt động
```sql
id          UUID PRIMARY KEY
user_id     UUID NULL
username    VARCHAR(255) NOT NULL
user_role   VARCHAR(20) NOT NULL
action      VARCHAR(100) NOT NULL                        -- ActivityAction enum
entity_type VARCHAR(50) NOT NULL                        -- 'AUTH'|'CUSTOMER'|'POINT_TRANSACTION'|'POINT_SETTING'
entity_id   TEXT NULL
description TEXT NOT NULL
metadata    JSONB NULL
created_at  TIMESTAMPTZ
```

---

## RPC Functions (Atomic)

### `earn_points_atomic(p_phone, p_name, p_amount, p_description?, p_reference_type?, p_reference_id?, p_created_by?)`
- Tìm hoặc tạo khách hàng theo phone
- Tính điểm theo setting hiện tại
- Tạo point_transaction (EARN)
- Tạo point_lot với expires_at = now() + expiry_days
- Cập nhật customers.total_points & lifetime_points_earned
- Returns: `{ success, customer_id, transaction_id, point_lot_id, points_earned, new_total_points, expires_at, expiry_days }`

### `redeem_points_fefo_atomic(p_customer_id, p_points_to_redeem, p_description?, p_created_by?, p_reference_type?, p_reference_id?)`
- Lock customer (FOR UPDATE)
- Kiểm tra đủ điểm không hết hạn
- Tạo point_transaction (REDEEM, điểm âm)
- Duyệt FEFO: trừ từng lô theo expires_at ASC
- Tạo point_redemption_allocations cho mỗi lô bị trừ
- Cập nhật customers.total_points & lifetime_points_used
- Returns: `{ success, transaction_id, customer_id, points_redeemed, new_total_points, allocations[] }`

### `adjust_points_atomic(p_customer_id, p_points_delta, p_reason, p_created_by?)`
- Nếu delta > 0: tạo ADJUST transaction + point_lot mới (expires 90 ngày)
- Nếu delta < 0: gọi redeem_points_fefo_atomic
- Cập nhật customers.total_points
- Returns: `{ success, transaction_id, points_delta, new_total_points }`

### `expire_points_atomic()`
- Quét tất cả point_lots có status='ACTIVE', expires_at <= now()
- Tạo EXPIRE transaction cho từng lô
- Cập nhật lot.status = 'EXPIRED'
- Cập nhật customers.total_points (GREATEST(0, ...))
- Returns: `{ success, lots_expired_count, total_points_expired }`

---

## Row Level Security (RLS)

Tất cả bảng đều có RLS enabled với policy `USING (true)` (open access):
- `Allow read/write customers`
- `Allow read/write point_settings`
- `Allow read/write point_transactions`
- `Allow read/write point_lots`
- `Allow read/write point_redemption_allocations`

**Note:** RLS hiện tại rất lỏng (allow all). Khi thêm tính năng bảo mật cần cập nhật policies.

---

## Common Query Patterns

```typescript
// Lấy khách hàng theo phone
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('phone', normalizedPhone)
  .maybeSingle();

// Lấy transactions kèm tên KH
const { data } = await supabase
  .from('point_transactions')
  .select('*, customers(name, phone)')
  .order('created_at', { ascending: false })
  .limit(20);

// Lấy lots sắp hết hạn
const { data } = await supabase
  .from('point_lots')
  .select('*, customers(*)')
  .eq('status', 'ACTIVE')
  .gt('remaining_points', 0)
  .gt('expires_at', now.toISOString())
  .lte('expires_at', future.toISOString())
  .order('expires_at', { ascending: true });

// Earn points (atomic)
const { data, error } = await supabase.rpc('earn_points_atomic', {
  p_phone: '0901234567',
  p_name: 'Nguyễn Văn A',
  p_amount: 200000,
  p_description: 'Thanh toán tiền sân',
  p_reference_type: 'BOOKING',
  p_reference_id: 'BK-001',
  p_created_by: 'STAFF',
});
```

---

## Thêm Cột / Bảng Mới

Khi cần mở rộng schema:
1. Viết SQL migration vào `supabase_schema.sql` (append, không xóa cũ)
2. Cập nhật TypeScript interface trong `src/types/database.ts`
3. Cập nhật loyalty-store.ts method tương ứng
4. Cập nhật seed data nếu cần (`supabase_seed.sql`)
