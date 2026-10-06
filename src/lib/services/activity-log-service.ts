import 'server-only';

import { getDatabase } from '@/lib/supabase/server';
import {
  ActivityAction,
  ActivityEntityType,
  ActivityLog,
  ActivityLogFilter,
  Actor,
} from '@/types/database';

const MAX_MEMORY_LOGS = 500;

export const SYSTEM_ACTOR: Actor = {
  id: 'system',
  username: 'HỆ THỐNG',
  name: 'Hệ thống',
  role: 'ADMIN',
};

class ActivityLogService {
  // Chế độ demo (chưa cấu hình Supabase): log nằm trong bộ nhớ server
  private memoryLogs: ActivityLog[] = [];

  /** Ghi log; lỗi ghi log không được làm hỏng thao tác nghiệp vụ chính */
  public async logActivity(
    actor: Actor,
    action: ActivityAction,
    entityType: ActivityEntityType,
    entityId: string | null,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const entry: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: actor.id,
      username: actor.username,
      user_role: actor.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      metadata,
      created_at: new Date().toISOString(),
    };

    try {
      const db = getDatabase();
      if (!db) {
        this.memoryLogs.unshift(entry);
        this.memoryLogs = this.memoryLogs.slice(0, MAX_MEMORY_LOGS);
        return;
      }

      const { id: _id, ...row } = entry;
      const { error } = await db.from('activity_logs').insert(row);
      if (error) console.error('Không ghi được activity_logs:', error.message);
    } catch (err) {
      console.error('Không ghi được activity_logs:', err);
    }
  }

  public async getActivityLogs(
    filters: ActivityLogFilter = {}
  ): Promise<{ logs: ActivityLog[]; total: number }> {
    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const offset = Math.max(filters.offset || 0, 0);
    const search = filters.search?.trim().toLowerCase() || '';

    const db = getDatabase();
    if (db) {
      let query = db
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.action && filters.action !== 'ALL') query = query.eq('action', filters.action);
      if (filters.role && filters.role !== 'ALL') query = query.eq('user_role', filters.role);
      if (search) {
        // Loại ký tự đặc biệt của cú pháp filter PostgREST trước khi ghép vào .or()
        const safe = search.replace(/[,()*%\\]/g, ' ');
        query = query.or(
          `description.ilike.%${safe}%,username.ilike.%${safe}%,entity_id.ilike.%${safe}%`
        );
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);
      if (error) throw new Error(error.message);
      return { logs: data as ActivityLog[], total: count ?? data.length };
    }

    let filtered = [...this.memoryLogs];
    if (filters.action && filters.action !== 'ALL') {
      filtered = filtered.filter((l) => l.action === filters.action);
    }
    if (filters.role && filters.role !== 'ALL') {
      filtered = filtered.filter((l) => l.user_role === filters.role);
    }
    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.description.toLowerCase().includes(search) ||
          l.username.toLowerCase().includes(search) ||
          l.entity_id?.toLowerCase().includes(search)
      );
    }
    return { logs: filtered.slice(offset, offset + limit), total: filtered.length };
  }
}

export const activityLogService = new ActivityLogService();
