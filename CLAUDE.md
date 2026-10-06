@AGENTS.md

# HL Sport – Hệ thống Tích Điểm (TichDiemHL)

Hệ thống tích điểm khách hàng cho sân cầu lông HL Badminton: tích điểm theo hóa đơn, dùng điểm theo FEFO, điểm hết hạn sau N ngày, tra cứu điểm công khai.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase (PostgreSQL) · lucide-react · canvas-confetti. Alias `@/` = `src/`.

## Lệnh

```bash
npm run dev                 # dev server :3000
npm run build               # build production (dùng để type-check)
npm run lint                # eslint
TEST_USERNAME=admin TEST_PASSWORD=... node --env-file=.env.local test_suite.mjs  # test API + bảo mật (cần dev server)
```

## Bản đồ code

- `src/app/` — pages + `api/*/route.ts`
- `src/components/{layout,dashboard,pos,modals,auth,ui}/`
- `src/lib/store/loyalty-store.ts` — business logic, chỉ chạy ở server (Supabase service role / in-memory khi dev)
- `src/lib/auth/` — session.ts + user-service.ts (server), auth-store.ts (client UI state)
- `src/lib/points-engine.ts` — hàm thuần: tính điểm, format VND, phone
- `src/types/database.ts` — mọi interface dùng chung
- `supabase_schema.sql` / `supabase_seed.sql` — schema + seed

## Quy tắc cốt lõi

1. Chỉ server chạm database (service role). Component gọi `loyaltyApi`; mọi API route bắt đầu bằng `requireUser()`.
2. Trừ điểm luôn theo **FEFO** (lô hết hạn sớm nhất trước); trên Supabase dùng RPC atomic.
3. Mọi thao tác quan trọng phải ghi `activityLogService.logActivity(...)`.
4. Luôn `normalizePhone()` trước khi lưu/tìm.
5. Text hiển thị cho người dùng bằng **tiếng Việt**.
6. Không hardcode secret / Supabase URL / key — chỉ đọc từ `process.env`.

Chi tiết theo chủ đề nằm trong `.claude/rules/` (tự nạp theo đường dẫn file) và `.claude/skills/` (nạp khi cần).

## Lưu ý

- Quy tắc style được ESLint ép buộc (`eslint.config.mjs`): không ternary lồng, không index làm key, không `any`, không `console.log`. `npm run lint` phải sạch trước khi commit.
- Màu / nhãn loại giao dịch & trạng thái lô: dùng `@/lib/transaction-display`, không viết lại ternary.
- Bảo mật Supabase (RLS, policy, RPC, service role): bắt buộc theo skill `supabase-security`. Sau khi đổi SQL, chạy lại `supabase_schema.sql` + `supabase_auth_logs.sql` trên Supabase.
