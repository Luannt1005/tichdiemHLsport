import { useSyncExternalStore } from 'react';
import { loyaltyApi, setUnauthorizedHandler } from '@/lib/api/loyalty-api';
import { AppUser, CreateUserInput, UserListResult, UserRole } from '@/types/database';

/**
 * Trạng thái đăng nhập phía CLIENT (chỉ để hiển thị UI).
 * Bằng chứng xác thực thật là cookie httpOnly do server cấp; mọi quyền được kiểm tra lại ở API.
 */
const SESSION_KEY = 'hl_auth_session';

type ActionResult = { success: boolean; error?: string };

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

async function run(action: () => Promise<unknown>, fallback: string): Promise<ActionResult> {
  try {
    await action();
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err, fallback) };
  }
}

class AuthStore {
  private currentUser: AppUser | null = null;
  private listeners: Set<(user: AppUser | null) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(SESSION_KEY);
        if (cached) this.currentUser = JSON.parse(cached) as AppUser;
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setUnauthorizedHandler(() => this.setUser(null));
  }

  private setUser(user: AppUser | null) {
    this.currentUser = user;
    if (typeof window !== 'undefined') {
      if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      else localStorage.removeItem(SESSION_KEY);
    }
    this.listeners.forEach((fn) => fn(user));
  }

  public subscribe(listener: (user: AppUser | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getCurrentUser(): AppUser | null {
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /** Xác minh lại phiên với server (role / trạng thái khóa mới nhất) */
  public async refresh(): Promise<AppUser | null> {
    try {
      const { user } = await loyaltyApi.me();
      this.setUser(user);
      return user;
    } catch {
      this.setUser(null);
      return null;
    }
  }

  public async login(username: string, password: string): Promise<ActionResult & { user?: AppUser }> {
    try {
      const { user } = await loyaltyApi.login(username, password);
      this.setUser(user);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: errorMessage(err, 'Có lỗi xảy ra khi đăng nhập') };
    }
  }

  public async logout(): Promise<void> {
    try {
      await loyaltyApi.logout();
    } finally {
      this.setUser(null);
    }
  }

  public async register(params: CreateUserInput): Promise<ActionResult & { user?: AppUser }> {
    try {
      const { user } = await loyaltyApi.register(params);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: errorMessage(err, 'Không thể tạo tài khoản') };
    }
  }

  public changePassword(oldPassword: string, newPassword: string): Promise<ActionResult> {
    return run(() => loyaltyApi.changePassword(oldPassword, newPassword), 'Không thể đổi mật khẩu');
  }

  // ===== Quản trị người dùng (ADMIN) =====

  public getUsers(): Promise<UserListResult> {
    return loyaltyApi.getUsers();
  }

  public async createUser(params: CreateUserInput): Promise<ActionResult & { user?: AppUser }> {
    try {
      const { user } = await loyaltyApi.createUser(params);
      return { success: true, user };
    } catch (err) {
      return { success: false, error: errorMessage(err, 'Không thể tạo tài khoản') };
    }
  }

  public async updateUserRole(userId: string, role: UserRole): Promise<ActionResult> {
    const result = await run(() => loyaltyApi.updateUserRole(userId, role), 'Không thể phân quyền');
    if (result.success && userId === this.currentUser?.id) await this.refresh();
    return result;
  }

  public toggleUserStatus(userId: string, isActive: boolean): Promise<ActionResult> {
    return run(() => loyaltyApi.setUserActive(userId, isActive), 'Không thể đổi trạng thái tài khoản');
  }

  public resetUserPassword(userId: string, newPassword: string): Promise<ActionResult> {
    return run(() => loyaltyApi.resetUserPassword(userId, newPassword), 'Đặt lại mật khẩu thất bại');
  }

  public deleteUser(userId: string): Promise<ActionResult> {
    return run(() => loyaltyApi.deleteUser(userId), 'Không thể xóa tài khoản');
  }
}

export const authStore = new AuthStore();

/** Hook React đọc user hiện tại và tự cập nhật khi đăng nhập / đăng xuất */
export function useCurrentUser(): AppUser | null {
  return useSyncExternalStore(
    (listener) => authStore.subscribe(listener),
    () => authStore.getCurrentUser(),
    () => null
  );
}
