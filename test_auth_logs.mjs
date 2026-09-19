import { PRESET_USERS } from './src/lib/auth/auth-store.js';

console.log('Testing auth configuration...');
console.log('Preset Users:', PRESET_USERS.map(u => ({ username: u.username, role: u.role, name: u.name })));

const admin = PRESET_USERS.find(u => u.username === 'admin');
if (!admin || admin.role !== 'ADMIN' || admin.password_hash !== 'admin123') {
  console.error('FAIL: Admin user not configured properly');
  process.exit(1);
}

const staff = PRESET_USERS.find(u => u.username === 'nhanvien');
if (!staff || staff.role !== 'STAFF' || staff.password_hash !== 'staff123') {
  console.error('FAIL: Staff user not configured properly');
  process.exit(1);
}

console.log('SUCCESS: Admin and Staff preset accounts verified.');
