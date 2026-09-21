import { supabase } from '@/lib/supabase/client';
import { AppUser, UserRole } from '@/types/database';

export interface StoredSession {
  user: AppUser;
  token: string;
  loginAt: string;
}

// Danh sách tài khoản mặc định được cấu hình sẵn cho hệ thống
export const PRESET_USERS: (AppUser & { password_hash: string })[] = [
  {
    id: 'user-admin-01',
    username: 'admin',
    email: 'admin@hlsport.vn',
    name: 'Quản trị viên HL Sport',
    role: 'ADMIN',
    password_hash: 'admin123',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-staff-01',
    username: 'nhanvien',
    email: 'nhanvien@hlsport.vn',
    name: 'Thu ngân HL Sport',
    role: 'STAFF',
    password_hash: 'staff123',
    is_active: true,
    last_login_at: new Date().toISOString(),
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const SESSION_KEY = 'hl_auth_session';
const USERS_KEY = 'hl_auth_users';

class AuthStore {
  private currentUser: AppUser | null = null;
  private users: (AppUser & { password_hash: string })[] = [...PRESET_USERS];
  private listeners: Set<(user: AppUser | null) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      // Tải danh sách user tùy chỉnh đã lưu trong localStorage
      const savedUsers = localStorage.getItem(USERS_KEY);
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        // Merge preset users with saved users
        const map = new Map<string, AppUser & { password_hash: string }>();
        for (const u of PRESET_USERS) map.set(u.username, u);
        for (const u of parsed) map.set(u.username, u);
        this.users = Array.from(map.values());
      } else {
        localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
      }

      // Tải session hiện tại
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (sessionStr) {
        const session: StoredSession = JSON.parse(sessionStr);
        this.currentUser = session.user;
      }
    } catch (e) {
      console.warn('AuthStore init error:', e);
    }
  }

  public subscribe(listener: (user: AppUser | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentUser));
  }

  public getCurrentUser(): AppUser | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (sessionStr) {
        try {
          const session: StoredSession = JSON.parse(sessionStr);
          this.currentUser = session.user;
        } catch (_) {}
      }
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  public async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    const rawUsername = usernameInput.trim().toLowerCase();
    const rawPassword = passwordInput.trim();

    if (!rawUsername || !rawPassword) {
      return { success: false, error: 'Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu' };
    }

    // 1. Thử xác thực với Supabase trước (nếu kết nối database)
    try {
      const { data: dbUser, error: dbError } = await supabase
        .from('app_users')
        .select('*')
        .or(`username.eq.${rawUsername},email.eq.${rawUsername}`)
        .eq('is_active', true)
        .maybeSingle();

      if (!dbError && dbUser) {
        if (dbUser.password_hash === rawPassword) {
          const userObj: AppUser = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role as UserRole,
            is_active: dbUser.is_active,
            last_login_at: new Date().toISOString(),
            created_at: dbUser.created_at,
          };

          // Cập nhật last_login_at trên Supabase
          await supabase
            .from('app_users')
            .update({ last_login_at: userObj.last_login_at })
            .eq('id', userObj.id);

          this.saveSession(userObj);
          return { success: true, user: userObj };
        } else {
          return { success: false, error: 'Mật khẩu không chính xác' };
        }
      }
    } catch (_) {
      // Fallback local store
    }

    // 2. Xác thực với danh sách tài khoản Local (bao gồm preset Admin & Staff)
    const localUser = this.users.find(
      (u) =>
        (u.username.toLowerCase() === rawUsername || (u.email && u.email.toLowerCase() === rawUsername)) &&
        u.is_active
    );

    if (!localUser) {
      return { success: false, error: 'Tài khoản không tồn tại hoặc đã bị khóa' };
    }

    if (localUser.password_hash !== rawPassword) {
      return { success: false, error: 'Mật khẩu không chính xác' };
    }

    const updatedUser: AppUser = {
      id: localUser.id,
      username: localUser.username,
      email: localUser.email,
      name: localUser.name,
      role: localUser.role,
      is_active: localUser.is_active,
      last_login_at: new Date().toISOString(),
      created_at: localUser.created_at,
    };

    // Update in memory & local storage
    localUser.last_login_at = updatedUser.last_login_at;
    this.saveUsersToLocalStorage();
    this.saveSession(updatedUser);

    return { success: true, user: updatedUser };
  }

  private saveSession(user: AppUser) {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      const session: StoredSession = {
        user,
        token: `session-${user.id}-${Date.now()}`,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Lưu role tương thích với loyaltyStore cũ
      localStorage.setItem('hl_loyalty_role', user.role);
    }
    this.notify();
  }

  private saveUsersToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(this.users));
    } catch (e) {
      console.warn('Save users error', e);
    }
  }

  public async logout(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
    this.notify();
  }

  public async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.currentUser) {
      return { success: false, error: 'Bạn chưa đăng nhập' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    }

    // Try Supabase first
    try {
      const { data: dbUser } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', this.currentUser.id)
        .maybeSingle();

      if (dbUser) {
        if (dbUser.password_hash !== oldPassword) {
          return { success: false, error: 'Mật khẩu cũ không chính xác' };
        }
        const { error: updateErr } = await supabase
          .from('app_users')
          .update({ password_hash: newPassword, updated_at: new Date().toISOString() })
          .eq('id', this.currentUser.id);

        if (updateErr) {
          return { success: false, error: 'Không thể cập nhật mật khẩu trên Supabase' };
        }
      }
    } catch (_) {}

    // Update local user
    const local = this.users.find((u) => u.id === this.currentUser?.id);
    if (local) {
      if (local.password_hash !== oldPassword) {
        return { success: false, error: 'Mật khẩu hiện tại không đúng' };
      }
      local.password_hash = newPassword;
      this.saveUsersToLocalStorage();
    }

    return { success: true };
  }

  public async register(params: {
    username: string;
    name: string;
    email?: string;
    password: string;
    role?: UserRole;
  }): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    const rawUsername = params.username.trim().toLowerCase();
    const rawName = params.name.trim();
    const rawEmail = params.email?.trim().toLowerCase() || null;
    const rawPassword = params.password.trim();
    const role: UserRole = params.role || 'STAFF';

    if (!rawUsername || rawUsername.length < 3) {
      return { success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' };
    }

    if (!/^[a-z0-9_]+$/.test(rawUsername)) {
      return {
        success: false,
        error: 'Tên đăng nhập chỉ được chứa chữ cái không dấu, chữ số và dấu gạch dưới (_)',
      };
    }

    if (!rawName || rawName.length < 2) {
      return { success: false, error: 'Họ và tên phải có ít nhất 2 ký tự' };
    }

    if (!rawPassword || rawPassword.length < 6) {
      return { success: false, error: 'Mật khẩu phải có tối thiểu 6 ký tự' };
    }

    // 1. Kiểm tra trên Supabase
    try {
      let query = supabase
        .from('app_users')
        .select('id, username, email')
        .or(`username.eq.${rawUsername}${rawEmail ? `,email.eq.${rawEmail}` : ''}`);

      const { data: existingUsers, error: checkErr } = await query;
      if (!checkErr && existingUsers && existingUsers.length > 0) {
        const found = existingUsers[0];
        if (found.username.toLowerCase() === rawUsername) {
          return { success: false, error: `Tên đăng nhập '${rawUsername}' đã được sử dụng` };
        }
        if (rawEmail && found.email?.toLowerCase() === rawEmail) {
          return { success: false, error: `Email '${rawEmail}' đã được sử dụng` };
        }
      }

      // Thử insert vào Supabase
      const { data: created, error: insertErr } = await supabase
        .from('app_users')
        .insert({
          username: rawUsername,
          name: rawName,
          email: rawEmail,
          password_hash: rawPassword,
          role,
          is_active: true,
          last_login_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!insertErr && created) {
        const userObj: AppUser = {
          id: created.id,
          username: created.username,
          name: created.name,
          email: created.email,
          role: created.role as UserRole,
          is_active: created.is_active,
          last_login_at: created.last_login_at,
          created_at: created.created_at,
        };

        this.users.push({ ...userObj, password_hash: rawPassword });
        this.saveUsersToLocalStorage();
        this.saveSession(userObj);
        return { success: true, user: userObj };
      }
    } catch (_) {
      // Fallback local
    }

    // 2. Kiểm tra trên local users
    const existsLocal = this.users.find(
      (u) =>
        u.username.toLowerCase() === rawUsername ||
        (rawEmail && u.email?.toLowerCase() === rawEmail)
    );

    if (existsLocal) {
      if (existsLocal.username.toLowerCase() === rawUsername) {
        return { success: false, error: `Tên đăng nhập '${rawUsername}' đã được sử dụng` };
      }
      return { success: false, error: `Email '${rawEmail}' đã được sử dụng` };
    }

    const newUser: AppUser & { password_hash: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username: rawUsername,
      name: rawName,
      email: rawEmail,
      password_hash: rawPassword,
      role,
      is_active: true,
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.saveUsersToLocalStorage();

    const userObj: AppUser = {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      is_active: newUser.is_active,
      last_login_at: newUser.last_login_at,
      created_at: newUser.created_at,
    };

    this.saveSession(userObj);
    return { success: true, user: userObj };
  }
}

export const authStore = new AuthStore();
