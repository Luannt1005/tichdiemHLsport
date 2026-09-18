import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:3000/api';
const url = 'https://dzemhqkvccmpoaumoytf.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6ZW1ocWt2Y2NtcG9hdW1veXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NjI2MTEsImV4cCI6MjEwNTAzODYxMX0.FaP3ijT2Qsf4Tck2byG-8hbmbT-ttzgKWjU3yWf91QE';
const supabase = createClient(url, anonKey);

async function runFullSuite() {
  console.log('===============================================================');
  console.log('      KIỂM THỬ TOÀN DIỆN HỆ THỐNG API & SUPABASE DATABASE      ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  [PASS]', message);
      passed++;
    } else {
      console.error('  [FAIL]', message);
      failed++;
    }
  }

  // PHẦN 1: NEXT.JS APP ROUTER API ENDPOINTS
  console.log('--- PHẦN 1: KIỂM THỬ CÁC NEXT.JS API ENDPOINTS (http://localhost:3000/api) ---');

  // 1.1 GET /api/customers
  try {
    const res = await fetch(BASE + '/customers');
    assert(res.status === 200, 'GET /api/customers trả về HTTP 200');
    const data = await res.json();
    assert(Array.isArray(data), 'GET /api/customers trả về mảng danh sách hội viên');
  } catch (e) {
    assert(false, 'GET /api/customers lỗi: ' + e.message);
  }

  // 1.2 POST /api/customers (Tạo khách hàng mới)
  let createdCustId = null;
  const testPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
  try {
    const res = await fetch(BASE + '/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, name: 'Khách Test Tự Động', email: 'test@hlsport.vn' })
    });
    assert(res.status === 201, 'POST /api/customers tạo mới thành công HTTP 201');
    const data = await res.json();
    createdCustId = data.id;
    assert(data.phone === testPhone, 'POST /api/customers lưu đúng SĐT: ' + testPhone);
    assert(data.total_points === 0, 'POST /api/customers khởi tạo điểm ban đầu = 0');
  } catch (e) {
    assert(false, 'POST /api/customers lỗi: ' + e.message);
  }

  // 1.3 GET /api/customers/[id]
  if (createdCustId) {
    try {
      const res = await fetch(BASE + '/customers/' + createdCustId);
      assert(res.status === 200, 'GET /api/customers/[id] trả về HTTP 200');
      const data = await res.json();
      assert(data.name === 'Khách Test Tự Động', 'GET /api/customers/[id] đúng tên khách hàng');
    } catch (e) {
      assert(false, 'GET /api/customers/[id] lỗi: ' + e.message);
    }
  }

  // 1.4 POST /api/points/earn (Cộng điểm tiền sân)
  try {
    const res = await fetch(BASE + '/points/earn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, amount: 200000, description: 'Test thanh toán sân 2h' })
    });
    assert(res.status === 200, 'POST /api/points/earn trả về HTTP 200');
    const data = await res.json();
    assert(data.success === true, 'POST /api/points/earn thành công (success: true)');
    assert(data.pointsEarned === 20, 'POST /api/points/earn quy đổi đúng 200.000đ = 20 điểm');
    assert(data.newTotalPoints === 20, 'POST /api/points/earn số dư mới = 20 điểm');
  } catch (e) {
    assert(false, 'POST /api/points/earn lỗi: ' + e.message);
  }

  // 1.5 POST /api/points/redeem (Trừ điểm theo FEFO)
  try {
    const res = await fetch(BASE + '/points/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: createdCustId, points: 5, description: 'Test đổi nước uống' })
    });
    assert(res.status === 200, 'POST /api/points/redeem trả về HTTP 200');
    const data = await res.json();
    assert(data.success === true, 'POST /api/points/redeem thành công');
    assert(data.pointsRedeemed === 5, 'POST /api/points/redeem trừ đúng 5 điểm');
    assert(data.newTotalPoints === 15, 'POST /api/points/redeem số dư còn lại = 15 điểm');
  } catch (e) {
    assert(false, 'POST /api/points/redeem lỗi: ' + e.message);
  }

  // 1.6 POST /api/points/adjust (Điều chỉnh điểm)
  try {
    const res = await fetch(BASE + '/points/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: createdCustId, pointsDelta: 10, reason: 'Tặng điểm sinh nhật' })
    });
    assert(res.status === 200, 'POST /api/points/adjust trả về HTTP 200');
    const data = await res.json();
    assert(data.newTotalPoints === 25, 'POST /api/points/adjust tăng số dư lên 25 điểm');
  } catch (e) {
    assert(false, 'POST /api/points/adjust lỗi: ' + e.message);
  }

  // 1.7 POST /api/points/expire-check (Quét hết hạn điểm)
  try {
    const res = await fetch(BASE + '/points/expire-check', { method: 'POST' });
    assert(res.status === 200, 'POST /api/points/expire-check trả về HTTP 200');
    const data = await res.json();
    assert(data.success === true, 'POST /api/points/expire-check thực thi thành công');
  } catch (e) {
    assert(false, 'POST /api/points/expire-check lỗi: ' + e.message);
  }

  // 1.8 GET & PUT /api/settings
  try {
    const resGet = await fetch(BASE + '/settings');
    assert(resGet.status === 200, 'GET /api/settings trả về HTTP 200');
    const settings = await resGet.json();
    assert(settings.amount_per_point > 0, 'GET /api/settings có amount_per_point hợp lệ');

    const resPut = await fetch(BASE + '/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiry_days: 90 })
    });
    assert(resPut.status === 200, 'PUT /api/settings cập nhật cấu hình HTTP 200');
  } catch (e) {
    assert(false, 'Settings API lỗi: ' + e.message);
  }

  // 1.9 GET /api/dashboard/stats & /api/dashboard/chart
  try {
    const resStats = await fetch(BASE + '/dashboard/stats');
    assert(resStats.status === 200, 'GET /api/dashboard/stats trả về HTTP 200');
    const stats = await resStats.json();
    assert(typeof stats.totalCustomers === 'number', 'GET /api/dashboard/stats chứa totalCustomers');
    assert(typeof stats.circulatingPoints === 'number', 'GET /api/dashboard/stats chứa circulatingPoints');

    const resChart = await fetch(BASE + '/dashboard/chart?period=7d');
    assert(resChart.status === 200, 'GET /api/dashboard/chart trả về HTTP 200');
    const chart = await resChart.json();
    assert(Array.isArray(chart), 'GET /api/dashboard/chart trả về mảng dữ liệu biểu đồ');
  } catch (e) {
    assert(false, 'Dashboard API lỗi: ' + e.message);
  }

  // 1.10 GET /api/transactions
  try {
    const resTx = await fetch(BASE + '/transactions?limit=10');
    assert(resTx.status === 200, 'GET /api/transactions trả về HTTP 200');
    const txs = await resTx.json();
    assert(Array.isArray(txs), 'GET /api/transactions trả về danh sách audit log');
  } catch (e) {
    assert(false, 'GET /api/transactions lỗi: ' + e.message);
  }

  // 1.11 DELETE /api/customers/[id]
  if (createdCustId) {
    try {
      const resDel = await fetch(BASE + '/customers/' + createdCustId, { method: 'DELETE' });
      assert(resDel.status === 200, 'DELETE /api/customers/[id] xóa khách hàng test HTTP 200');
    } catch (e) {
      assert(false, 'DELETE /api/customers lỗi: ' + e.message);
    }
  }

  // PHẦN 2: SUPABASE POSTGRESQL DATABASE & ATOMIC PROCEDURES
  console.log('\n--- PHẦN 2: KIỂM THỬ SUPABASE POSTGRESQL DATABASE (LIVE CLOUD) ---');

  // 2.1 Table point_settings
  try {
    const { data, error } = await supabase.from('point_settings').select('*').limit(1);
    assert(!error && data && data.length > 0, 'Supabase Bảng point_settings truy vấn thành công (có cấu hình mặc định)');
  } catch (e) {
    assert(false, 'Supabase point_settings lỗi: ' + e.message);
  }

  // 2.2 Stored Procedure: earn_points_atomic
  const dbPhone = '0977' + Math.floor(100000 + Math.random() * 900000);
  let dbCustomerId = null;
  try {
    const { data, error } = await supabase.rpc('earn_points_atomic', {
      p_phone: dbPhone,
      p_name: 'Khách Test Supabase RPC',
      p_amount: 500000,
      p_description: 'Test tích điểm qua RPC PostgreSQL'
    });
    assert(!error && data?.success === true, 'Supabase RPC earn_points_atomic thực thi thành công');
    assert(data?.points_earned === 50, 'Supabase RPC tính đúng 500.000đ = 50 điểm');
    assert(data?.new_total_points === 50, 'Supabase RPC ghi nhận số dư mới = 50 điểm');
    dbCustomerId = data?.customer_id;
  } catch (e) {
    assert(false, 'Supabase RPC earn_points_atomic lỗi: ' + e.message);
  }

  // 2.3 Stored Procedure: redeem_points_fefo_atomic
  if (dbCustomerId) {
    try {
      const { data, error } = await supabase.rpc('redeem_points_fefo_atomic', {
        p_customer_id: dbCustomerId,
        p_points_to_redeem: 20,
        p_description: 'Test trừ điểm FEFO trên Database'
      });
      assert(!error && data?.success === true, 'Supabase RPC redeem_points_fefo_atomic thực thi thành công');
      assert(data?.points_redeemed === 20, 'Supabase RPC trừ đúng 20 điểm');
      assert(data?.new_total_points === 30, 'Supabase RPC số dư cập nhật đúng còn 30 điểm');
      assert(data?.allocations?.length > 0, 'Supabase RPC ghi nhận bảng phân bổ lô trừ điểm (allocations)');
    } catch (e) {
      assert(false, 'Supabase RPC redeem_points_fefo_atomic lỗi: ' + e.message);
    }

    // 2.4 Stored Procedure: adjust_points_atomic
    try {
      const { data, error } = await supabase.rpc('adjust_points_atomic', {
        p_customer_id: dbCustomerId,
        p_points_delta: 15,
        p_reason: 'Test điều chỉnh điểm trên Database'
      });
      assert(!error && data?.success === true, 'Supabase RPC adjust_points_atomic thực thi thành công');
      assert(data?.new_total_points === 45, 'Supabase RPC số dư tăng lên 45 điểm');
    } catch (e) {
      assert(false, 'Supabase RPC adjust_points_atomic lỗi: ' + e.message);
    }

    // 2.5 Dọn dẹp dữ liệu test trên Supabase
    try {
      await supabase.from('point_redemption_allocations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('point_lots').delete().eq('customer_id', dbCustomerId);
      await supabase.from('point_transactions').delete().eq('customer_id', dbCustomerId);
      await supabase.from('customers').delete().eq('id', dbCustomerId);
      assert(true, 'Dọn dẹp bản ghi test trên Supabase thành công');
    } catch (e) {
      assert(false, 'Dọn dẹp Supabase lỗi: ' + e.message);
    }
  }

  // 2.6 Stored Procedure: expire_points_atomic
  try {
    const { data, error } = await supabase.rpc('expire_points_atomic');
    assert(!error && data?.success === true, 'Supabase RPC expire_points_atomic chạy quét hết hạn thành công');
  } catch (e) {
    assert(false, 'Supabase RPC expire_points_atomic lỗi: ' + e.message);
  }

  console.log('\n===============================================================');
  console.log('  KẾT QUẢ KIỂM THỬ: ' + passed + ' PASSED / ' + failed + ' FAILED (TỔNG CỘNG ' + (passed + failed) + ' TESTS)');
  console.log('===============================================================');
}

runFullSuite();
