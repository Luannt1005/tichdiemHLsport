import { supabase } from '@/lib/supabase/client';
import { ActivityAction, ActivityLog, UserRole } from '@/types/database';
import { authStore } from '@/lib/auth/auth-store';

const LOCAL_LOGS_KEY = 'hl_activity_logs';

export interface ActivityLogFilter {
  action?: string;
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// Initial sample logs for realistic audit trail on clean load
const SEED_LOGS: ActivityLog[] = [
  {
    id: 'log-seed-01',
    user_id: 'user-admin-01',
    username: 'admin',
    user_role: 'ADMIN',
    action: 'LOGIN',
    entity_type: 'AUTH',
    entity_id: 'user-admin-01',
    description: 'Đăng nhập thành công vào trang quản trị hệ thống',
    metadata: { ip: '127.0.0.1', device: 'Desktop Chrome' },
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'log-seed-02',
    user_id: 'user-admin-01',
    username: 'admin',
    user_role: 'ADMIN',
    action: 'SETTINGS_UPDATE',
    entity_type: 'POINT_SETTING',
    entity_id: 'default-setting-01',
    description: 'Cập nhật cấu hình tích điểm: 10,000đ = 1 điểm, hết hạn 90 ngày',
    metadata: { amount_per_point: 10000, points_per_amount: 1, expiry_days: 90 },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'log-seed-03',
    user_id: 'user-staff-01',
    username: 'nhanvien',
    user_role: 'STAFF',
    action: 'LOGIN',
    entity_type: 'AUTH',
    entity_id: 'user-staff-01',
    description: 'Đăng nhập ca làm việc thu ngân sân',
    metadata: { ip: '127.0.0.1', device: 'POS Terminal' },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'log-seed-04',
    user_id: 'user-staff-01',
    username: 'nhanvien',
    user_role: 'STAFF',
    action: 'POINTS_EARN',
    entity_type: 'POINT_TRANSACTION',
    entity_id: 'tx-01',
    description: 'Tích 1,000 điểm cho khách hàng Nguyễn Văn An (SĐT: 0901234567) từ hóa đơn 10,000,000đ',
    metadata: { phone: '0901234567', amount: 10000000, points: 1000 },
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

class ActivityLogService {
  private localLogs: ActivityLog[] = [];

  constructor() {
    this.initLocalLogs();
  }

  private initLocalLogs() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LOCAL_LOGS_KEY);
      if (saved) {
        this.localLogs = JSON.parse(saved);
      } else {
        this.localLogs = [...SEED_LOGS];
        localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(this.localLogs));
      }
    } catch (e) {
      this.localLogs = [...SEED_LOGS];
    }
  }

  private saveLocalLogs() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(this.localLogs));
    } catch (e) {
      console.warn('Cannot save activity logs to localStorage', e);
    }
  }

  public async logActivity(
    action: ActivityAction,
    entityType: 'AUTH' | 'CUSTOMER' | 'POINT_TRANSACTION' | 'POINT_SETTING',
    entityId: string | null,
    description: string,
    metadata?: Record<string, any>
  ): Promise<ActivityLog> {
    const currentUser = authStore.getCurrentUser();
    const username = currentUser ? currentUser.username : 'HỆ THỐNG';
    const userRole: UserRole = currentUser ? currentUser.role : 'ADMIN';
    const userId = currentUser ? currentUser.id : 'system';

    const logEntry: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      username,
      user_role: userRole,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    // 1. Thử lưu vào Supabase
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: logEntry.user_id,
          username: logEntry.username,
          user_role: logEntry.user_role,
          action: logEntry.action,
          entity_type: logEntry.entity_type,
          entity_id: logEntry.entity_id,
          description: logEntry.description,
          metadata: logEntry.metadata,
          created_at: logEntry.created_at,
        })
        .select()
        .single();

      if (!error && data) {
        logEntry.id = data.id;
      }
    } catch (err) {
      console.warn('Lỗi ghi Supabase activity_logs (đang dùng fallback local):', err);
    }

    // 2. Luôn lưu vào localLogs để sẵn sàng hiển thị tức thì
    this.localLogs.unshift(logEntry);
    if (this.localLogs.length > 500) {
      this.localLogs = this.localLogs.slice(0, 500);
    }
    this.saveLocalLogs();

    return logEntry;
  }

  public async getActivityLogs(filters?: ActivityLogFilter): Promise<{ logs: ActivityLog[]; total: number }> {
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    // 1. Thử truy vấn từ Supabase
    try {
      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.action && filters.action !== 'ALL') {
        query = query.eq('action', filters.action);
      }
      if (filters?.role && filters.role !== 'ALL') {
        query = query.eq('user_role', filters.role);
      }
      if (filters?.search && filters.search.trim()) {
        const s = filters.search.trim();
        query = query.or(`description.ilike.%${s}%,username.ilike.%${s}%,entity_id.ilike.%${s}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (!error && data && data.length > 0) {
        return {
          logs: data as ActivityLog[],
          total: count || data.length,
        };
      }
    } catch (e) {
      console.warn('Lỗi truy vấn Supabase activity_logs, dùng local fallback:', e);
    }

    // 2. Fallback local logs
    let filtered = [...this.localLogs];

    if (filters?.action && filters.action !== 'ALL') {
      filtered = filtered.filter((l) => l.action === filters.action);
    }
    if (filters?.role && filters.role !== 'ALL') {
      filtered = filtered.filter((l) => l.user_role === filters.role);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.username.toLowerCase().includes(q) ||
          (l.entity_id && l.entity_id.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      logs: paginated,
      total,
    };
  }
}

export const activityLogService = new ActivityLogService();
