import 'server-only';

import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getDatabase } from '@/lib/supabase/server';
import { AppUser, CreateUserInput, UserListResult, UserRole } from '@/types/database';

const BCRYPT_ROUNDS = 10;
const USER_COLUMNS = 'id, username, email, name, role, is_active, last_login_at, created_at';
const INVALID_LOGIN = 'Tên đăng nhập hoặc mật khẩu không chính xác';
// Hash giả để so khớp khi không tìm thấy user → thời gian phản hồi không lộ username có tồn tại hay không
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

type StoredUser = AppUser & { password_hash: string };

// Chế độ demo (chưa cấu hình Supabase, chỉ ở dev): tài khoản nằm trong bộ nhớ server
const memoryUsers: StoredUser[] =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        {
          id: 'user-admin-01',
          username: 'admin',
          email: 'admin@hlsport.vn',
          name: 'Quản trị viên HL Sport',
          role: 'ADMIN',
          password_hash: bcrypt.hashSync('admin123', BCRYPT_ROUNDS),
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'user-staff-01',
          username: 'nhanvien',
          email: 'nhanvien@hlsport.vn',
          name: 'Thu ngân HL Sport',
          role: 'STAFF',
          password_hash: bcrypt.hashSync('staff123', BCRYPT_ROUNDS),
          is_active: true,
          last_login_at: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ];

function toPublicUser(row: StoredUser | AppUser): AppUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    name: row.name,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at ?? null,
    created_at: row.created_at,
  };
}

/** Hỗ trợ cả hash bcrypt lẫn mật khẩu plaintext cũ (sẽ được hash lại ngay sau khi đăng nhập đúng) */
async function verifyPassword(
  input: string,
  stored: string
): Promise<{ ok: boolean; needsRehash: boolean }> {
  if (stored.startsWith('$2')) {
    return { ok: await bcrypt.compare(input, stored), needsRehash: false };
  }
  const a = Buffer.from(input);
  const b = Buffer.from(stored);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function validateNewPassword(password: string): void {
  if (!password || password.length < 6) {
    throw new Error('Mật khẩu phải có tối thiểu 6 ký tự');
  }
}

function normalizeCreateInput(input: CreateUserInput) {
  const username = input.username.trim().toLowerCase();
  const name = input.name.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const password = input.password;

  if (username.length < 3) throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
  if (!/^[a-z0-9_]+$/.test(username)) {
    throw new Error('Tên đăng nhập chỉ được chứa chữ cái không dấu, chữ số và dấu gạch dưới (_)');
  }
  if (name.length < 2) throw new Error('Họ và tên phải có ít nhất 2 ký tự');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email không hợp lệ');
  validateNewPassword(password);

  return { username, name, email, password };
}

class UserService {
  public async login(
    usernameOrEmail: string,
    password: string
  ): Promise<{ user: AppUser } | { error: string }> {
    const identifier = usernameOrEmail.trim().toLowerCase();
    if (!identifier || !password) {
      return { error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' };
    }

    const stored = await this.findByIdentifier(identifier);
    const check = await verifyPassword(password, stored?.password_hash ?? DUMMY_HASH);
    if (!stored || !check.ok || !stored.is_active) {
      return { error: INVALID_LOGIN };
    }

    const lastLoginAt = new Date().toISOString();
    const db = getDatabase();
    if (db) {
      const updates: Record<string, string> = { last_login_at: lastLoginAt };
      if (check.needsRehash) updates.password_hash = await hashPassword(password);
      await db.from('app_users').update(updates).eq('id', stored.id);
    } else {
      stored.last_login_at = lastLoginAt;
    }

    return { user: toPublicUser({ ...stored, last_login_at: lastLoginAt }) };
  }

  private async findByIdentifier(identifier: string): Promise<StoredUser | null> {
    const db = getDatabase();
    if (!db) {
      return (
        memoryUsers.find((u) => u.username === identifier || u.email?.toLowerCase() === identifier) ??
        null
      );
    }

    // Hai truy vấn .eq riêng — không ghép input người dùng vào chuỗi filter .or()
    const byUsername = await db
      .from('app_users')
      .select(`${USER_COLUMNS}, password_hash`)
      .eq('username', identifier)
      .maybeSingle();
    if (byUsername.error) throw new Error(byUsername.error.message);
    if (byUsername.data) return byUsername.data as StoredUser;

    const byEmail = await db
      .from('app_users')
      .select(`${USER_COLUMNS}, password_hash`)
      .eq('email', identifier)
      .maybeSingle();
    if (byEmail.error) throw new Error(byEmail.error.message);
    return (byEmail.data as StoredUser | null) ?? null;
  }

  public async getActiveUserById(id: string): Promise<AppUser | null> {
    const db = getDatabase();
    if (!db) {
      const user = memoryUsers.find((u) => u.id === id && u.is_active);
      return user ? toPublicUser(user) : null;
    }

    const { data, error } = await db
      .from('app_users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return null;
    return toPublicUser(data as AppUser);
  }

  public async listUsers(): Promise<UserListResult> {
    const db = getDatabase();
    if (!db) {
      return { users: memoryUsers.map(toPublicUser), databaseReady: false };
    }

    const { data, error } = await db
      .from('app_users')
      .select(USER_COLUMNS)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return { users: (data as AppUser[]).map(toPublicUser), databaseReady: true };
  }

  public async createUser(input: CreateUserInput, options: { isActive: boolean }): Promise<AppUser> {
    const { username, name, email, password } = normalizeCreateInput(input);
    const role: UserRole = input.role === 'ADMIN' ? 'ADMIN' : 'STAFF';
    const passwordHash = await hashPassword(password);

    const db = getDatabase();
    if (!db) {
      if (memoryUsers.some((u) => u.username === username || (email && u.email === email))) {
        throw new Error('Tên đăng nhập hoặc email đã được sử dụng');
      }
      const user: StoredUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username,
        name,
        email,
        role,
        password_hash: passwordHash,
        is_active: options.isActive,
        last_login_at: null,
        created_at: new Date().toISOString(),
      };
      memoryUsers.unshift(user);
      return toPublicUser(user);
    }

    const { data, error } = await db
      .from('app_users')
      .insert({
        username,
        name,
        email,
        password_hash: passwordHash,
        role,
        is_active: options.isActive,
      })
      .select(USER_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Tên đăng nhập hoặc email đã được sử dụng');
      throw new Error(`Không thể tạo tài khoản: ${error.message}`);
    }
    return toPublicUser(data as AppUser);
  }

  private async getUserOrThrow(id: string): Promise<AppUser> {
    const db = getDatabase();
    if (!db) {
      const user = memoryUsers.find((u) => u.id === id);
      if (!user) throw new Error('Không tìm thấy tài khoản người dùng');
      return toPublicUser(user);
    }
    const { data, error } = await db.from('app_users').select(USER_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Không tìm thấy tài khoản người dùng');
    return toPublicUser(data as AppUser);
  }

  private async countActiveAdmins(): Promise<number> {
    const db = getDatabase();
    if (!db) return memoryUsers.filter((u) => u.role === 'ADMIN' && u.is_active).length;

    const { count, error } = await db
      .from('app_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'ADMIN')
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  private async assertNotLastAdmin(target: AppUser, message: string): Promise<void> {
    if (target.role === 'ADMIN' && target.is_active && (await this.countActiveAdmins()) <= 1) {
      throw new Error(message);
    }
  }

  private async updateUser(id: string, updates: Partial<StoredUser>): Promise<void> {
    const db = getDatabase();
    if (!db) {
      const user = memoryUsers.find((u) => u.id === id);
      if (user) Object.assign(user, updates);
      return;
    }
    const { error } = await db
      .from('app_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  public async updateRole(id: string, role: UserRole): Promise<AppUser> {
    const target = await this.getUserOrThrow(id);
    if (role !== 'ADMIN') {
      await this.assertNotLastAdmin(
        target,
        'Không thể hạ quyền của Quản trị viên duy nhất đang hoạt động trong hệ thống'
      );
    }
    await this.updateUser(id, { role });
    return { ...target, role };
  }

  public async setActive(actorId: string, id: string, isActive: boolean): Promise<AppUser> {
    if (actorId === id && !isActive) throw new Error('Bạn không thể tự khóa tài khoản của chính mình!');
    const target = await this.getUserOrThrow(id);
    if (!isActive) {
      await this.assertNotLastAdmin(target, 'Không thể khóa Quản trị viên duy nhất đang hoạt động');
    }
    await this.updateUser(id, { is_active: isActive });
    return { ...target, is_active: isActive };
  }

  public async resetPassword(id: string, newPassword: string): Promise<AppUser> {
    validateNewPassword(newPassword);
    const target = await this.getUserOrThrow(id);
    await this.updateUser(id, { password_hash: await hashPassword(newPassword) });
    return target;
  }

  public async changeOwnPassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    validateNewPassword(newPassword);

    const db = getDatabase();
    let storedHash: string | undefined;
    if (db) {
      const { data, error } = await db.from('app_users').select('password_hash').eq('id', id).maybeSingle();
      if (error) throw new Error(error.message);
      storedHash = data?.password_hash;
    } else {
      storedHash = memoryUsers.find((u) => u.id === id)?.password_hash;
    }

    if (!storedHash || !(await verifyPassword(oldPassword, storedHash)).ok) {
      throw new Error('Mật khẩu hiện tại không đúng');
    }
    await this.updateUser(id, { password_hash: await hashPassword(newPassword) });
  }

  public async deleteUser(actorId: string, id: string): Promise<AppUser> {
    if (actorId === id) throw new Error('Bạn không thể tự xóa tài khoản của chính mình!');
    const target = await this.getUserOrThrow(id);
    await this.assertNotLastAdmin(target, 'Không thể xóa Quản trị viên duy nhất trong hệ thống!');

    const db = getDatabase();
    if (!db) {
      const index = memoryUsers.findIndex((u) => u.id === id);
      if (index !== -1) memoryUsers.splice(index, 1);
      return target;
    }
    const { error } = await db.from('app_users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return target;
  }
}

export const userService = new UserService();
