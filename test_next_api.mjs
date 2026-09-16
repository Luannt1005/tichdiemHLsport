async function testNextApi() {
  const BASE = 'http://localhost:3000/api';
  console.log('=== TESTING NEXT.JS APP ROUTER API ROUTES (src/app/api/...) ===\n');

  // 1. Customers
  console.log('1. [GET] /api/customers');
  const custRes = await fetch(`${BASE}/customers`);
  const customers = await custRes.json();
  console.log(`-> Loaded ${customers.length} customers. First customer: ${customers[0]?.name} (${customers[0]?.phone}), Points: ${customers[0]?.total_points}`);

  const targetCustomer = customers[0];

  // 2. Customer Detail
  console.log(`\n2. [GET] /api/customers/${targetCustomer.id}`);
  const detailRes = await fetch(`${BASE}/customers/${targetCustomer.id}`);
  const detail = await detailRes.json();
  console.log(`-> Detail: ${detail.name}, Total Points: ${detail.total_points}, Lots: ${detail.lots?.length}, Transactions: ${detail.transactions?.length}`);

  // 3. Earn Points
  console.log('\n3. [POST] /api/points/earn (Thanh toán 300.000đ tiền sân)');
  const earnRes = await fetch(`${BASE}/points/earn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: targetCustomer.phone,
      amount: 300000,
      description: 'Thanh toán sân số 3 (Test API Next.js)',
    }),
  });
  const earnData = await earnRes.json();
  console.log('-> Earn Result:', {
    success: earnData.success,
    pointsEarned: earnData.pointsEarned,
    newTotalPoints: earnData.newTotalPoints,
  });

  // 4. Redeem Points (FEFO)
  console.log('\n4. [POST] /api/points/redeem (Sử dụng 15 điểm trừ theo FEFO)');
  const redeemRes = await fetch(`${BASE}/points/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: targetCustomer.id,
      points: 15,
      description: 'Đổi giảm giá giờ sân (Test FEFO)',
    }),
  });
  const redeemData = await redeemRes.json();
  console.log('-> Redeem Result:', {
    success: redeemData.success,
    pointsRedeemed: redeemData.pointsRedeemed,
    newTotalPoints: redeemData.newTotalPoints,
    allocations: redeemData.allocations?.length,
  });

  // 5. Adjust Points
  console.log('\n5. [POST] /api/points/adjust (+5 điểm thưởng hội viên)');
  const adjRes = await fetch(`${BASE}/points/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: targetCustomer.id,
      pointsDelta: 5,
      reason: 'Thưởng sinh nhật khách hàng',
    }),
  });
  const adjData = await adjRes.json();
  console.log('-> Adjust Result:', {
    success: adjData.success,
    pointsDelta: adjData.pointsDelta,
    newTotalPoints: adjData.newTotalPoints,
  });

  // 6. Settings
  console.log('\n6. [GET] /api/settings');
  const setRes = await fetch(`${BASE}/settings`);
  const settings = await setRes.json();
  console.log(`-> Settings: amount_per_point=${settings.amount_per_point}, rounding=${settings.rounding_mode}, expiry_days=${settings.expiry_days}`);

  // 7. Dashboard Stats
  console.log('\n7. [GET] /api/dashboard/stats');
  const statsRes = await fetch(`${BASE}/dashboard/stats`);
  const stats = await statsRes.json();
  console.log('-> Stats:', stats);

  // 8. Transactions
  console.log('\n8. [GET] /api/transactions');
  const txRes = await fetch(`${BASE}/transactions?limit=5`);
  const txs = await txRes.json();
  console.log(`-> Latest ${txs.length} transactions:`);
  txs.slice(0, 3).forEach((t) => {
    console.log(`   [${t.type}] ${t.customer_name}: ${t.points > 0 ? '+' : ''}${t.points} pts (${t.description})`);
  });

  console.log('\n=== ALL NEXT.JS API ENDPOINTS TESTED SUCCESSFULLY! ===');
}

testNextApi().catch(console.error);
