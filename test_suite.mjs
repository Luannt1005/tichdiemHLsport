/**
 * Kiểm thử API + bảo mật. Chạy khi dev server đang chạy:
 *   TEST_USERNAME=admin TEST_PASSWORD=... node --env-file=.env.local test_suite.mjs
 *
 * - Chỉ tạo / xóa đúng một khách hàng test do chính script tạo ra, không xóa dữ liệu khác.
 * - Phần cuối dùng anon key (công khai) để xác nhận Supabase đã chặn truy cập trực tiếp.
 */
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000/api';
const TEST_PHONE = '0909' + String(Date.now()).slice(-6);

let passed = 0;
let failed = 0;
function assert(condition, message) {
  console.log(condition ? '  [PASS]' : '  [FAIL]', message);
  if (condition) passed++;
  else failed++;
}

let cookie = '';
async function api(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function run() {
  console.log('=== PHẦN 1: API PHẢI YÊU CẦU ĐĂNG NHẬP ===');
  for (const [method, path] of [
    ['GET', '/customers'],
    ['GET', '/transactions'],
    ['GET', '/dashboard/stats'],
    ['GET', '/logs'],
    ['GET', '/users'],
    ['POST', '/points/earn'],
    ['POST', '/points/adjust'],
    ['PUT', '/settings'],
  ]) {
    const { status } = await api(path, { method, body: method === 'GET' ? undefined : {}, auth: false });
    assert(status === 401, `${method} ${path} khi chưa đăng nhập → 401 (được ${status})`);
  }

  const forged = await fetch(BASE + '/customers', { headers: { Cookie: 'hl_session=eyJ1aWQiOiJ4In0.gia-mao' } });
  assert(forged.status === 401, `Cookie phiên giả mạo bị từ chối (được ${forged.status})`);

  const reg = await api('/auth/register', {
    method: 'POST',
    auth: false,
    body: { username: `test_${Date.now()}`, name: 'Test Register', password: 'test123456', role: 'ADMIN' },
  });
  assert(
    reg.status === 201 && reg.data.user?.role === 'STAFF' && reg.data.user?.is_active === false,
    'Đăng ký công khai luôn tạo STAFF ở trạng thái chờ duyệt (bỏ qua role=ADMIN gửi lên)'
  );

  const lookup = await api('/lookup?phone=0000000000', { auth: false });
  assert(lookup.status === 404 || lookup.status === 400, `Tra cứu SĐT không tồn tại → 404/400 (được ${lookup.status})`);

  console.log('\n=== PHẦN 2: NGHIỆP VỤ SAU KHI ĐĂNG NHẬP ===');
  const username = process.env.TEST_USERNAME;
  const password = process.env.TEST_PASSWORD;
  if (!username || !password) {
    console.log('  (bỏ qua — đặt TEST_USERNAME / TEST_PASSWORD để chạy phần này)');
  } else {
    const bad = await api('/auth/login', { method: 'POST', auth: false, body: { username, password: password + 'x' } });
    assert(bad.status === 401, 'Sai mật khẩu → 401');

    const login = await api('/auth/login', { method: 'POST', auth: false, body: { username, password } });
    assert(login.status === 200 && !!cookie, `Đăng nhập ${username} thành công`);
    assert(login.data.user && !('password_hash' in login.data.user), 'Response đăng nhập không chứa password_hash');
    const isAdmin = login.data.user?.role === 'ADMIN';

    const created = await api('/customers', { method: 'POST', body: { phone: TEST_PHONE, name: 'Khách Test Suite' } });
    assert(created.status === 201, `Tạo khách test ${TEST_PHONE}`);
    const customerId = created.data.id;

    const earn = await api('/points/earn', {
      method: 'POST',
      body: { phone: TEST_PHONE, amount: 300000, description: 'Test suite', createdBy: 'HACKER' },
    });
    assert(earn.status === 200 && earn.data.pointsEarned > 0, `Tích điểm 300.000đ → ${earn.data.pointsEarned} điểm`);
    assert(earn.data.transaction?.created_by === username, 'created_by lấy từ phiên đăng nhập, không lấy từ body');

    const redeem = await api('/points/redeem', { method: 'POST', body: { customerId, points: 5 } });
    assert(redeem.status === 200 && redeem.data.allocations?.length >= 1, 'Dùng 5 điểm theo FEFO có allocation');

    const tooMuch = await api('/points/redeem', { method: 'POST', body: { customerId, points: 999999 } });
    assert(tooMuch.status === 400, 'Dùng vượt số dư bị từ chối');

    const lookupOk = await api(`/lookup?phone=${TEST_PHONE}`, { auth: false });
    assert(lookupOk.status === 200, 'Tra cứu công khai SĐT test');
    assert(
      lookupOk.data.customer && !('email' in lookupOk.data.customer) && !('id' in lookupOk.data.customer),
      'Tra cứu công khai không lộ email / id nội bộ'
    );

    const stats = await api('/dashboard/stats');
    assert(stats.status === 200 && typeof stats.data.totalCustomers === 'number', 'Lấy thống kê dashboard');

    const adjust = await api('/points/adjust', { method: 'POST', body: { customerId, pointsDelta: 3, reason: 'Test' } });
    const del = await api(`/customers/${customerId}`, { method: 'DELETE' });
    if (isAdmin) {
      assert(adjust.status === 200, 'ADMIN điều chỉnh điểm');
      assert(del.status === 200, 'ADMIN xóa khách test');
      if (reg.data.user?.id) await api(`/users/${reg.data.user.id}`, { method: 'DELETE' });
    } else {
      assert(adjust.status === 403, 'STAFF không được điều chỉnh điểm (403)');
      assert(del.status === 403, 'STAFF không được xóa khách hàng (403)');
      console.log(`  (cần ADMIN xóa tay khách test ${TEST_PHONE} và tài khoản chờ duyệt test_*)`);
    }

    await api('/auth/logout', { method: 'POST' });
    const afterLogout = await api('/customers', { auth: false });
    assert(afterLogout.status === 401, 'Sau đăng xuất không gọi được API');
  }

  console.log('\n=== PHẦN 3: SUPABASE CHẶN ANON KEY (CÔNG KHAI) ===');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.log('  (bỏ qua — thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  } else {
    const anon = createClient(url, anonKey);
    for (const table of ['customers', 'point_settings', 'point_transactions', 'point_lots', 'point_redemption_allocations', 'app_users', 'activity_logs']) {
      const { data, error } = await anon.from(table).select('*').limit(1);
      assert(!!error || (data && data.length === 0), `anon không đọc được ${table}`);
    }
    const { error: rpcError } = await anon.rpc('adjust_points_atomic', {
      p_customer_id: '00000000-0000-0000-0000-000000000000',
      p_points_delta: 1,
      p_reason: 'security test',
    });
    assert(!!rpcError && /permission|not exist|denied/i.test(rpcError.message), `anon không gọi được RPC adjust_points_atomic (${rpcError?.message})`);
  }

  console.log(`\nKẾT QUẢ: ${passed} PASS, ${failed} FAIL`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Lỗi chạy test:', err);
  process.exit(1);
});
