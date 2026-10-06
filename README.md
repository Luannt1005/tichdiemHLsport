# HL Sport – Hệ thống Tích Điểm

Tích điểm khách hàng cho sân cầu lông HL Badminton: tích điểm theo hóa đơn, dùng điểm theo FEFO (lô sắp hết hạn trừ trước), điểm tự hết hạn, khách tự tra cứu điểm công khai.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (PostgreSQL)

## Cài đặt

```bash
npm install
```

Tạo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # chỉ dùng ở server, KHÔNG thêm tiền tố NEXT_PUBLIC_
SESSION_SECRET=<chuỗi ngẫu nhiên ≥ 32 ký tự>     # ký cookie phiên đăng nhập
```

Thiếu cấu hình Supabase thì ở môi trường dev, app chạy bằng dữ liệu in-memory (tài khoản demo `admin/admin123`).

## Database

Trên Supabase → SQL Editor, chạy lần lượt (chạy lại nhiều lần cũng an toàn):

1. `supabase_schema.sql` — bảng, RPC atomic, RLS + phân quyền
2. `supabase_auth_logs.sql` — tài khoản (bcrypt) + nhật ký hoạt động
3. `supabase_seed.sql` — *(tuỳ chọn, chỉ cho môi trường thử)* 10 khách hàng mẫu

Đổi mật khẩu tài khoản khởi tạo ngay sau lần đăng nhập đầu tiên.

## Lệnh

```bash
npm run dev      # http://localhost:3000
npm run build
npm run lint
TEST_USERNAME=admin TEST_PASSWORD=... node --env-file=.env.local test_suite.mjs   # cần dev server đang chạy
```

## Kiến trúc

```
Trình duyệt ──fetch (cookie httpOnly)──► /api/* (kiểm tra phiên + quyền) ──service role──► Supabase
```

Trình duyệt không truy cập Supabase trực tiếp; anon key không được dùng. Chi tiết quy ước code nằm trong `CLAUDE.md` và `.claude/`.
