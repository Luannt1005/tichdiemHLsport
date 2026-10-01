---
name: hlsport-code-patterns
description: >
  Bộ quy tắc code, kiến trúc, và conventions cho dự án Hệ thống Tích Điểm HL Badminton.
  Bao gồm: store patterns, auth, FEFO logic, API routes, component conventions,
  TypeScript types, và Supabase integration. Đọc TRƯỚC KHI viết bất kỳ logic nào.
---

# HL Sport – Code Patterns & Conventions

## 1. Project Stack

```
Framework:    Next.js 16.3.5 (App Router)
Language:     TypeScript 5
UI:           React 19 + Tailwind CSS v4
Database:     Supabase (PostgreSQL)
Icons:        lucide-react
Confetti:     canvas-confetti (dùng khi tích điểm thành công)
Auth:         Custom localStorage-based auth (KHÔNG dùng Supabase Auth)
```

**Alias `@/`** = `src/` (cấu hình trong tsconfig.json)

---

## 2. File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard (/)
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles + CSS vars
│   ├── admin/page.tsx      # Quản trị hệ thống (ADMIN only)
│   ├── customers/
│   │   ├── page.tsx        # Danh sách KH
│   │   └── [id]/page.tsx   # Chi tiết KH
│   ├── history/page.tsx    # Lịch sử giao dịch
│   ├── settings/page.tsx   # Cài đặt điểm (ADMIN only)
│   ├── logs/page.tsx       # Nhật ký hoạt động
│   ├── login/page.tsx      # Đăng nhập (public)
│   ├── register/           # Đăng ký (public)
│   ├── lookup/ & tra-cuu/  # Tra cứu điểm công khai (public)
│   └── api/                # Route Handlers
│       ├── customers/route.ts
│       ├── customers/[id]/route.ts
│       ├── points/earn/route.ts
│       ├── points/redeem/route.ts
│       ├── points/adjust/route.ts
│       ├── points/expire-check/route.ts
│       ├── dashboard/...
│       ├── transactions/route.ts
│       └── settings/route.ts
│
├── components/
│   ├── layout/             # AppShell, Sidebar, Header
│   ├── dashboard/          # KpiCards, PointChart, ExpiringSoonSection
│   ├── pos/                # EarnPointsModal, RedeemPointsModal
│   ├── modals/             # EditCustomerModal
│   ├── auth/               # AccountProfileModal
│   └── ui/                 # Toast (shared UI)
│
├── lib/
│   ├── store/loyalty-store.ts    # Core business logic (~1877 lines)
│   ├── auth/auth-store.ts        # Authentication
│   ├── services/activity-log-service.ts
│   ├── supabase/client.ts        # Supabase client singleton
│   ├── api/loyalty-api.ts        # Internal API client
│   └── points-engine.ts          # Pure calculation functions
│
└── types/database.ts             # All TypeScript interfaces
```

---

## 3. TypeScript Types (src/types/database.ts)

```typescript
// Transaction types
type TransactionType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REFUND';
type LotStatus = 'ACTIVE' | 'FULLY_USED' | 'EXPIRED';
type RoundingMode = 'FLOOR' | 'ROUND' | 'CEIL';
type CustomerStatus = 'ACTIVE' | 'INACTIVE';
type UserRole = 'ADMIN' | 'STAFF';

// Key interfaces
interface Customer { id, phone, name, email?, total_points, lifetime_points_earned, lifetime_points_used, status, last_transaction_at, created_at, updated_at, expiring_soon_points? }
interface PointTransaction { id, customer_id, customer_name?, customer_phone?, type, points, amount, reference_type, reference_id?, description, created_by, created_at }
interface PointLot { id, customer_id, transaction_id, original_points, remaining_points, earned_at, expires_at, status, days_left? }
interface PointSetting { id, amount_per_point, points_per_amount, rounding_mode, expiry_days, is_active, updated_by, created_at, updated_at }
interface AppUser { id, username, email?, name, role, is_active, last_login_at?, created_at }
interface ActivityLog { id, user_id?, username, user_role, action, entity_type, entity_id?, description, metadata?, created_at }
interface DashboardStats { totalCustomers, customersWithPoints, circulatingPoints, totalEarnedPoints, totalUsedPoints, totalExpiredPoints, expiringIn30Days }
```

---

## 4. Dual-Mode Store Architecture

`loyaltyStore` và `authStore` đều hoạt động theo mô hình **Dual-Mode**:

```
Primary:  Supabase (PostgreSQL) — khi isSupabaseLive = true
Fallback: localStorage + in-memory seed data — khi offline/chưa kết nối

Flow khi gọi bất kỳ method nào:
1. if (!hasCheckedSupabase) await checkSupabaseConnection()
2. if (isSupabaseLive) → gọi Supabase → return
3. else → fallback localStorage/in-memory
```

**QUAN TRỌNG**: Không bao giờ gọi Supabase trực tiếp trong component. Luôn gọi qua `loyaltyStore` hoặc API routes.

```typescript
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { authStore } from '@/lib/auth/auth-store';
```

---

## 5. FEFO (First Expired, First Out) Logic

Khi trừ điểm (redeem/adjust âm), hệ thống LUÔN trừ từ lô điểm gần hết hạn nhất trước:

```typescript
// Lấy các lô hợp lệ sắp xếp theo expires_at ASC
const validLots = lots
  .filter(l => l.customer_id === id && l.status === 'ACTIVE' && l.remaining_points > 0 && new Date(l.expires_at) > now)
  .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

// Trừ tuần tự cho đến khi đủ điểm
for (const lot of validLots) {
  const deduct = Math.min(lot.remaining_points, needed);
  lot.remaining_points -= deduct;
  if (lot.remaining_points === 0) lot.status = 'FULLY_USED';
  needed -= deduct;
  if (needed === 0) break;
}
```

**Trên Supabase:** Gọi RPC `redeem_points_fefo_atomic` (atomic transaction).

---

## 6. Authentication

### Auth Store Methods
```typescript
import { authStore } from '@/lib/auth/auth-store';

authStore.getCurrentUser()        // → AppUser | null
authStore.isAuthenticated()       // → boolean
authStore.subscribe(listener)     // → unsubscribe fn (reactive updates)
authStore.login(username, pass)   // → { success, user?, error? }
authStore.logout()                // → void
authStore.register(params)        // → { success, user?, error? }
authStore.getUsers()              // → AppUser[] (ADMIN only)
authStore.updateUserRole(id, role)
authStore.toggleUserStatus(id)
authStore.resetUserPassword(id, newPass)
authStore.deleteUser(id)
```

### Preset Accounts
```
ADMIN:  username=admin,    password=admin123
STAFF:  username=nhanvien, password=staff123
```

### RBAC Pattern trong component
```tsx
const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

useEffect(() => {
  setCurrentUser(authStore.getCurrentUser());
  const unsub = authStore.subscribe(u => setCurrentUser(u));
  return () => unsub();
}, []);

// ADMIN-only guard
if (!currentUser || currentUser.role !== 'ADMIN') {
  return <AccessDeniedScreen />;
}
```

### Public Routes (không cần đăng nhập)
```typescript
const PUBLIC_PATHS = ['/login', '/register', '/dang-ky', '/lookup', '/tra-cuu'];
```

---

## 7. Points Engine (Pure Functions)

```typescript
import {
  calculatePoints,      // (amount, amountPerPoint, pointsPerAmount, roundingMode) → number
  calculateExpiryDate,  // (days) → Date
  getDaysUntilExpiry,   // (expiresAtStr) → number
  normalizePhone,       // ('0901 234 567') → '0901234567'
  isValidVietnamesePhone, // ('0901234567') → boolean
  formatVND,            // (10000) → '10.000 ₫'
  formatDateTime,       // (isoStr) → 'dd/MM/yyyy HH:mm'
  formatDateOnly,       // (isoStr) → 'dd/MM/yyyy'
} from '@/lib/points-engine';
```

**Công thức tính điểm:**
```
rawPoints = (amount / amount_per_point) * points_per_amount
points = FLOOR/ROUND/CEIL(rawPoints)
points = max(1, points)  // tối thiểu 1 điểm
```

Default: 10,000đ = 1 điểm, FLOOR, 90 ngày hết hạn.

---

## 8. Activity Logging

Mọi hành động quan trọng PHẢI ghi log:

```typescript
import { activityLogService } from '@/lib/services/activity-log-service';

await activityLogService.logActivity(
  'POINTS_EARN',           // ActivityAction
  'POINT_TRANSACTION',     // entity_type: 'AUTH' | 'CUSTOMER' | 'POINT_TRANSACTION' | 'POINT_SETTING'
  transaction.id,          // entity_id (có thể null)
  `Mô tả hành động...`,    // description (tiếng Việt)
  { phone, amount, points } // metadata (object tùy ý)
);
```

### ActivityAction values
```
LOGIN, LOGOUT, USER_REGISTER, USER_UPDATE_ROLE, USER_STATUS_CHANGE,
USER_RESET_PASSWORD, USER_DELETE,
CUSTOMER_CREATE, CUSTOMER_UPDATE, CUSTOMER_DELETE,
POINTS_EARN, POINTS_REDEEM, POINTS_ADJUST,
SETTINGS_UPDATE, EXPIRE_CHECK
```

---

## 9. Supabase Client

```typescript
import { supabase } from '@/lib/supabase/client';

// Standard query pattern
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .order('created_at', { ascending: false });

if (error) throw new Error(error.message);

// RPC atomic functions
const { data, error } = await supabase.rpc('earn_points_atomic', {
  p_phone: '0901234567',
  p_amount: 200000,
  // ...
});
```

### Database Tables
```
customers                    — KH: phone(UNIQUE), name, total_points, status
point_transactions           — TX: type EARN|REDEEM|EXPIRE|ADJUST|REFUND
point_lots                   — Lô điểm FEFO: original_points, remaining_points, expires_at
point_redemption_allocations — Audit: lô nào bị trừ bao nhiêu điểm
point_settings               — Cấu hình: 1 row active tại một thời điểm
app_users                    — Người dùng hệ thống
activity_logs                — Nhật ký hoạt động
```

### Atomic RPC Functions (Supabase)
```
earn_points_atomic(p_phone, p_name, p_amount, p_description?, ...)
redeem_points_fefo_atomic(p_customer_id, p_points_to_redeem, ...)
adjust_points_atomic(p_customer_id, p_points_delta, p_reason, ...)
expire_points_atomic()
```

---

## 10. API Routes Pattern

```typescript
// src/app/api/something/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { loyaltyStore } from '@/lib/store/loyalty-store';

export async function GET(req: NextRequest) {
  try {
    const data = await loyaltyStore.someMethod();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate input...
    const result = await loyaltyStore.someMethod(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

### Internal API Client
```typescript
import { loyaltyApi } from '@/lib/api/loyalty-api';

// Sử dụng API client (components không cần biết URL)
await loyaltyApi.earnPoints({ phone, amount, name });
await loyaltyApi.redeemPoints({ customerId, points });
await loyaltyApi.getCustomers(searchQuery);
```

---

## 11. Component Conventions

### 'use client' Directive
- Mọi component dùng hooks (useState, useEffect, useRouter, etc.) → **PHẢI có** `'use client';`
- Page components dùng interactive state → `'use client';`
- Pure server components (không có state) → không cần

### Component File Pattern
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { loyaltyStore } from '@/lib/store/loyalty-store';
import { Customer } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

interface ComponentProps {
  customerId: string;
  onSuccess?: () => void;
}

export function ComponentName({ customerId, onSuccess }: ComponentProps) {
  const { success, error } = useToast();
  const [data, setData] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // load data
  }, [customerId]);

  return (
    <div>...</div>
  );
}
```

### Modal Pattern
- Dùng `createPortal(content, document.body)` để modal không bị clip bởi overflow
- Check `mounted` state để tránh SSR error
- Backdrop click để đóng
- Escape key support (tùy chọn)

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!isOpen || !mounted) return null;

return createPortal(<ModalContent />, document.body);
```

---

## 12. Số Điện Thoại Việt Nam

Luôn normalize phone trước khi lưu/tìm kiếm:

```typescript
import { normalizePhone, isValidVietnamesePhone } from '@/lib/points-engine';

const cleaned = normalizePhone('0901 234 567'); // → '0901234567'
if (!isValidVietnamesePhone(cleaned)) throw new Error('SĐT không hợp lệ');
```

---

## 13. Tiền Tệ & Số

```typescript
import { formatVND } from '@/lib/points-engine';

formatVND(200000)  // → '200.000 ₫'

// Số điểm
points.toLocaleString('vi-VN')  // → '1.000'

// Input tiền (nhập bằng K)
const amountVND = (Number(amountK) || 0) * 1000;  // 200K → 200000đ
```

---

## 14. Balance Synchronization

Sau mọi thao tác điểm, PHẢI gọi để đảm bảo số dư đồng bộ:

```typescript
this.syncAllCustomerBalances();  // Recalculate từ active lots
this.saveToLocalStorage();       // Persist về localStorage
```

---

## 15. Error Handling Convention

```typescript
// Trong store/service
try {
  const { data, error } = await supabase.from('...').select('*');
  if (error) throw new Error(error.message || 'Lỗi database');
  return data;
} catch (err) {
  // Fallback to local
}

// Trong component
try {
  setLoading(true);
  await loyaltyStore.someMethod(params);
  success('Thành công!', 'Mô tả chi tiết');
  onSuccess?.();
} catch (err: any) {
  error('Lỗi', err.message || 'Đã xảy ra lỗi');
} finally {
  setLoading(false);
}
```

---

## 16. Confetti (Hiệu ứng mừng tích điểm)

```typescript
import confetti from 'canvas-confetti';

// Dùng sau khi EARN points thành công
confetti({
  particleCount: 100,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#1B6C39', '#207D43', '#34D399', '#FCD34D', '#ffffff'],
});
```

---

## 17. Navigation (Sidebar items & RBAC)

```
Tất cả users: Khách hàng (/customers), Lịch sử giao dịch (/history), Tổng quan (/), Nhật ký (/logs)
ADMIN only:   Cài đặt tích điểm (/settings), Quản trị hệ thống (/admin)
Public:       Tra cứu (/lookup, /tra-cuu), Đăng nhập (/login), Đăng ký (/register, /dang-ky)
```

---

## 18. LocalStorage Keys

```
hl_auth_session          — Phiên đăng nhập hiện tại
hl_auth_users            — Danh sách users
hl_loyalty_customers     — Danh sách khách hàng
hl_loyalty_lots          — Point lots
hl_loyalty_transactions  — Giao dịch điểm
hl_loyalty_allocations   — Phân bổ trừ điểm
hl_loyalty_settings      — Cấu hình điểm
hl_loyalty_role          — Role hiện tại
hl_activity_logs         — Nhật ký hoạt động (max 500)
```

**KHÔNG** tự thêm localStorage keys mới nếu không cần thiết.
