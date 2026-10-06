import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getDatabase } from '@/lib/supabase/server';
import { activityLogService } from '@/lib/services/activity-log-service';
import {
  DEFAULT_SETTING,
  calculateBonusPoints,
  calculateExpiryDate,
  calculatePoints,
  getDaysUntilExpiry,
  isValidVietnamesePhone,
  normalizePhone,
} from '@/lib/points-engine';
import {
  Actor,
  AdjustPointsInput,
  AdjustPointsResult,
  BonusTier,
  ChartDataPoint,
  ChartPeriod,
  Customer,
  CustomerFilter,
  DashboardStats,
  EarnPointsInput,
  EarnPointsResult,
  ExpireCheckResult,
  ExpiringLot,
  PaginatedCustomers,
  PaginatedTransactions,
  PointLot,
  PointRedemptionAllocation,
  PointSetting,
  PointSettingUpdate,
  PointTransaction,
  PublicLookupResult,
  RedeemPointsInput,
  RedeemPointsResult,
  TransactionType,
} from '@/types/database';

const EXPIRING_WINDOW_DAYS = 30;
const PAGE_SIZE = 1000; // giới hạn mặc định số dòng mỗi request của PostgREST
const MAX_TEXT_LENGTH = 500;
const TRANSACTION_TYPES: TransactionType[] = ['EARN', 'REDEEM', 'EXPIRE', 'ADJUST', 'REFUND'];
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

type TransactionRow = PointTransaction & { customers?: { name: string; phone: string } | null };
type LotRow = PointLot & { customers?: Customer | null };
type RpcAllocation = { lot_id: string; points_deducted: number; lot_expires_at: string };

// ---------- Helpers thuần ----------

function parsePhone(phone: string): string {
  const cleaned = normalizePhone(phone);
  if (!isValidVietnamesePhone(cleaned)) {
    throw new Error('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 0)');
  }
  return cleaned;
}

/** Loại ký tự đặc biệt của cú pháp filter PostgREST trước khi ghép vào .or() */
function toSafeFilterText(text: string): string {
  return text.replace(/[,()*%\\]/g, ' ').trim();
}

function cleanText(text: string | undefined, fallback: string): string {
  const value = text?.trim();
  return value ? value.slice(0, MAX_TEXT_LENGTH) : fallback;
}

function newLocalId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

function withDaysLeft<T extends PointLot>(lot: T): T {
  return { ...lot, days_left: getDaysUntilExpiry(lot.expires_at) };
}

function toTransaction(row: TransactionRow): PointTransaction {
  const { customers, ...tx } = row;
  return {
    ...tx,
    amount: Number(tx.amount) || 0,
    customer_name: customers?.name || tx.customer_name || 'Khách hàng',
    customer_phone: customers?.phone || tx.customer_phone || '',
  };
}

function isActiveUnexpired(lot: PointLot, now: Date): boolean {
  return lot.status === 'ACTIVE' && lot.remaining_points > 0 && new Date(lot.expires_at) > now;
}

function isExpiringWithin(lot: PointLot, days: number, now: Date): boolean {
  const limit = new Date(now.getTime() + days * 86400000);
  return isActiveUnexpired(lot, now) && new Date(lot.expires_at) <= limit;
}

function validateSettingUpdate(update: PointSettingUpdate): PointSettingUpdate {
  const result: PointSettingUpdate = {};
  const positive = (value: unknown, label: string, integer = false): number => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isInteger(n))) {
      throw new Error(`${label} phải là số ${integer ? 'nguyên ' : ''}lớn hơn 0`);
    }
    return n;
  };

  if (update.amount_per_point !== undefined) {
    result.amount_per_point = positive(update.amount_per_point, 'Số tiền quy đổi 1 điểm');
  }
  if (update.points_per_amount !== undefined) {
    result.points_per_amount = positive(update.points_per_amount, 'Số điểm mỗi mốc tiền', true);
  }
  if (update.cash_per_point !== undefined) {
    result.cash_per_point = positive(update.cash_per_point, 'Giá trị tiền mặt của 1 điểm');
  }
  if (update.expiry_days !== undefined) {
    result.expiry_days = positive(update.expiry_days, 'Số ngày hết hạn', true);
  }
  if (update.bonus_tiers !== undefined) {
    if (!Array.isArray(update.bonus_tiers)) throw new Error('Danh sách mốc thưởng không hợp lệ');
    result.bonus_tiers = update.bonus_tiers.map(
      (tier): BonusTier => ({
        id: String(tier.id || newLocalId('bt')).slice(0, 50),
        minAmount: positive(tier.minAmount, 'Ngưỡng hóa đơn của mốc thưởng'),
        bonusPoints: positive(tier.bonusPoints, 'Điểm thưởng của mốc', true),
        label: tier.label ? String(tier.label).slice(0, 100) : undefined,
      })
    );
  }
  return result;
}

/** Ngày theo giờ Việt Nam dạng YYYY-MM-DD */
function vnDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: VN_TIMEZONE }).format(date);
}

function dayDiff(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86400000);
}

function computeStats(
  customers: Pick<Customer, 'total_points'>[],
  transactions: Pick<PointTransaction, 'type' | 'points'>[],
  expiringPoints: number
): DashboardStats {
  const sumAbs = (type: TransactionType) =>
    transactions.filter((t) => t.type === type).reduce((sum, t) => sum + Math.abs(t.points), 0);

  return {
    totalCustomers: customers.length,
    customersWithPoints: customers.filter((c) => c.total_points > 0).length,
    circulatingPoints: customers.reduce((sum, c) => sum + c.total_points, 0),
    totalEarnedPoints: transactions
      .filter((t) => t.type === 'EARN' || (t.type === 'REFUND' && t.points > 0))
      .reduce((sum, t) => sum + t.points, 0),
    totalUsedPoints: sumAbs('REDEEM'),
    totalExpiredPoints: sumAbs('EXPIRE'),
    expiringIn30Days: expiringPoints,
  };
}

function buildChart(
  period: ChartPeriod,
  transactions: Pick<PointTransaction, 'type' | 'points' | 'created_at'>[]
): ChartDataPoint[] {
  const now = new Date();
  const todayKey = vnDateKey(now);
  let points: ChartDataPoint[];
  let bucketOf: (txKey: string) => number;

  if (period === '7d') {
    points = Array.from({ length: 7 }, (_, index) => {
      const key = vnDateKey(new Date(now.getTime() - (6 - index) * 86400000));
      const label = index === 6 ? 'Hôm nay' : `${key.slice(8, 10)}/${key.slice(5, 7)}`;
      return { date: key, label, earned: 0, redeemed: 0, expired: 0 };
    });
    bucketOf = (txKey) => 6 - dayDiff(txKey, todayKey);
  } else if (period === '30d') {
    // 5 nhóm, mỗi nhóm 6 ngày, nhóm cuối kết thúc hôm nay
    points = Array.from({ length: 5 }, (_, index) => ({
      date: vnDateKey(new Date(now.getTime() - (4 - index) * 6 * 86400000)),
      label: `Tuần ${index + 1}`,
      earned: 0,
      redeemed: 0,
      expired: 0,
    }));
    bucketOf = (txKey) => 4 - Math.floor(dayDiff(txKey, todayKey) / 6);
  } else {
    const [year, month] = todayKey.split('-').map(Number);
    points = Array.from({ length: 12 }, (_, index) => {
      const d = new Date(Date.UTC(year, month - 1 - (11 - index), 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      return { date: key, label: `T${d.getUTCMonth() + 1}`, earned: 0, redeemed: 0, expired: 0 };
    });
    bucketOf = (txKey) => points.findIndex((p) => p.date === txKey.slice(0, 7));
  }

  for (const tx of transactions) {
    const bucket = points[bucketOf(vnDateKey(new Date(tx.created_at)))];
    if (!bucket) continue;
    if (tx.type === 'EARN' || tx.type === 'REFUND') bucket.earned += tx.points;
    else if (tx.type === 'REDEEM') bucket.redeemed += Math.abs(tx.points);
    else if (tx.type === 'EXPIRE') bucket.expired += Math.abs(tx.points);
  }
  return points;
}

function chartStartDate(period: ChartPeriod): Date {
  const days = { '7d': 7, '30d': 30, '12m': 366 }[period];
  return new Date(Date.now() - days * 86400000);
}

/** Đọc hết mọi trang (PostgREST mặc định trả tối đa 1000 dòng / request) */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

// ---------- Store ----------

/**
 * Nghiệp vụ tích điểm — CHỈ chạy ở server (API route).
 * Supabase (service role) khi đã cấu hình; ngược lại dùng dữ liệu in-memory cho môi trường dev.
 */
class LoyaltyStore {
  // Chế độ demo in-memory (chỉ dùng khi chưa cấu hình Supabase ở dev)
  private customers: Customer[] = [];
  private lots: PointLot[] = [];
  private transactions: PointTransaction[] = [];
  private allocations: PointRedemptionAllocation[] = [];
  private settings: PointSetting = { ...DEFAULT_SETTING };

  private syncAllCustomerBalances() {
    const now = new Date();
    for (const c of this.customers) {
      c.total_points = this.lots
        .filter((lot) => lot.customer_id === c.id && isActiveUnexpired(lot, now))
        .reduce((sum, lot) => sum + lot.remaining_points, 0);
    }
  }

  private memoryExpiringPoints(customerId: string): number {
    const now = new Date();
    return this.lots
      .filter((lot) => lot.customer_id === customerId && isExpiringWithin(lot, EXPIRING_WINDOW_DAYS, now))
      .reduce((sum, lot) => sum + lot.remaining_points, 0);
  }

  private async liveExpiringPoints(db: SupabaseClient, customerId?: string): Promise<Map<string, number>> {
    const now = new Date();
    const limit = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 86400000);
    const rows = await fetchAll<Pick<PointLot, 'customer_id' | 'remaining_points'>>((from, to) => {
      let q = db
        .from('point_lots')
        .select('customer_id, remaining_points')
        .eq('status', 'ACTIVE')
        .gt('remaining_points', 0)
        .gt('expires_at', now.toISOString())
        .lte('expires_at', limit.toISOString());
      if (customerId) q = q.eq('customer_id', customerId);
      return q.range(from, to);
    });

    const map = new Map<string, number>();
    for (const row of rows) map.set(row.customer_id, (map.get(row.customer_id) || 0) + row.remaining_points);
    return map;
  }

  private async liveExpiringPointsForIds(db: SupabaseClient, customerIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (customerIds.length === 0) return map;
    const now = new Date();
    const limit = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 86400000);
    const { data, error } = await db
      .from('point_lots')
      .select('customer_id, remaining_points')
      .eq('status', 'ACTIVE')
      .gt('remaining_points', 0)
      .gt('expires_at', now.toISOString())
      .lte('expires_at', limit.toISOString())
      .in('customer_id', customerIds);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      map.set(row.customer_id, (map.get(row.customer_id) || 0) + Number(row.remaining_points || 0));
    }
    return map;
  }

  private async liveCustomerOrThrow(db: SupabaseClient, id: string): Promise<Customer> {
    const { data, error } = await db.from('customers').select('*').eq('id', id).maybeSingle();
    if (error || !data) throw new Error('Không tìm thấy khách hàng');
    return data as Customer;
  }

  // ===== SETTINGS =====

  public async getPointSettings(): Promise<PointSetting> {
    const db = getDatabase();
    if (db) {
      const { data, error } = await db
        .from('point_settings')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) {
        this.settings = {
          ...this.settings,
          ...data,
          amount_per_point: Number(data.amount_per_point),
          cash_per_point: Number(data.cash_per_point ?? this.settings.cash_per_point ?? 1000),
          bonus_tiers: data.bonus_tiers ?? this.settings.bonus_tiers,
        };
      }
    }
    return { ...this.settings, rounding_mode: 'FLOOR' };
  }

  public async updatePointSettings(actor: Actor, update: PointSettingUpdate): Promise<PointSetting> {
    const changes = validateSettingUpdate(update);
    const row = {
      ...changes,
      rounding_mode: 'FLOOR' as const,
      updated_by: actor.username,
      updated_at: new Date().toISOString(),
    };

    const db = getDatabase();
    if (db) {
      let res = await db.from('point_settings').update(row).eq('is_active', true).select().single();
      if (res.error?.code === 'PGRST204') {
        // DB chưa có cột bonus_tiers → lưu phần còn lại, mốc thưởng giữ trong bộ nhớ server
        const { bonus_tiers: _tiers, ...withoutTiers } = row;
        res = await db.from('point_settings').update(withoutTiers).eq('is_active', true).select().single();
      }
      if (res.error) throw new Error(res.error.message || 'Lỗi cập nhật cấu hình trên Database');
      this.settings = { ...this.settings, ...res.data, bonus_tiers: res.data.bonus_tiers ?? changes.bonus_tiers ?? this.settings.bonus_tiers };
    } else {
      this.settings = { ...this.settings, ...row };
    }

    const s = await this.getPointSettings();
    await activityLogService.logActivity(
      actor,
      'SETTINGS_UPDATE',
      'POINT_SETTING',
      s.id,
      `Cập nhật cấu hình: ${s.amount_per_point.toLocaleString('vi-VN')}đ = ${s.points_per_amount} điểm, 1 điểm = ${(s.cash_per_point || 1000).toLocaleString('vi-VN')}đ tiền mặt, hạn ${s.expiry_days} ngày`,
      { ...changes }
    );
    return s;
  }

  // ===== CUSTOMERS =====

  public async getCustomers(
    query = '',
    filter: CustomerFilter = 'ALL',
    page = 1,
    pageSize = 20
  ): Promise<PaginatedCustomers> {
    const currentPage = Math.max(1, Math.floor(page || 1));
    const size = Math.min(Math.max(1, Math.floor(pageSize || 20)), 100);
    const from = (currentPage - 1) * size;
    const to = from + size - 1;
    const search = toSafeFilterText(query);

    const db = getDatabase();
    if (db) {
      let q = db.from('customers').select('*', { count: 'exact' });

      if (search) {
        q = q.or(`phone.ilike.%${search}%,name.ilike.%${search}%`);
      }

      if (filter === 'HAS_POINTS') {
        q = q.gt('total_points', 0);
      } else if (filter === 'NO_POINTS') {
        q = q.eq('total_points', 0);
      } else if (filter === 'EXPIRING_SOON') {
        const now = new Date();
        const limit = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 86400000);
        const expiringLots = await fetchAll<Pick<PointLot, 'customer_id'>>((f, t) =>
          db
            .from('point_lots')
            .select('customer_id')
            .eq('status', 'ACTIVE')
            .gt('remaining_points', 0)
            .gt('expires_at', now.toISOString())
            .lte('expires_at', limit.toISOString())
            .range(f, t)
        );
        const customerIds = Array.from(new Set(expiringLots.map((l) => l.customer_id)));
        if (customerIds.length === 0) {
          return { customers: [], total: 0, page: currentPage, pageSize: size, totalPages: 1 };
        }
        q = q.in('id', customerIds);
      } else if (filter === 'EXPIRED') {
        const expiredLots = await fetchAll<Pick<PointLot, 'customer_id'>>((f, t) =>
          db.from('point_lots').select('customer_id').eq('status', 'EXPIRED').range(f, t)
        );
        const customerIds = Array.from(new Set(expiredLots.map((l) => l.customer_id)));
        if (customerIds.length === 0) {
          return { customers: [], total: 0, page: currentPage, pageSize: size, totalPages: 1 };
        }
        q = q.in('id', customerIds);
      }

      q = q.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await q;
      if (error) throw new Error(error.message);

      const customerRows = (data as Customer[]) || [];
      const pageIds = customerRows.map((c) => c.id);
      const expiringMap = await this.liveExpiringPointsForIds(db, pageIds);

      const customers = customerRows.map((c) => ({
        ...c,
        expiring_soon_points: expiringMap.get(c.id) || 0,
      }));

      const total = count ?? customers.length;
      const totalPages = Math.ceil(total / size) || 1;

      return {
        customers,
        total,
        page: currentPage,
        pageSize: size,
        totalPages,
      };
    }

    // Chế độ demo in-memory
    this.syncAllCustomerBalances();
    const qText = search.toLowerCase();
    let filtered = this.customers.filter(
      (c) => !qText || c.phone.includes(qText) || c.name.toLowerCase().includes(qText)
    );

    if (filter === 'HAS_POINTS') {
      filtered = filtered.filter((c) => c.total_points > 0);
    } else if (filter === 'NO_POINTS') {
      filtered = filtered.filter((c) => c.total_points === 0);
    } else if (filter === 'EXPIRING_SOON') {
      filtered = filtered.filter((c) => this.memoryExpiringPoints(c.id) > 0);
    } else if (filter === 'EXPIRED') {
      const expiredCustomerIds = new Set(this.lots.filter((l) => l.status === 'EXPIRED').map((l) => l.customer_id));
      filtered = filtered.filter((c) => expiredCustomerIds.has(c.id));
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / size) || 1;
    const customers = filtered.slice(from, to + 1).map((c) => ({
      ...c,
      expiring_soon_points: this.memoryExpiringPoints(c.id),
    }));

    return {
      customers,
      total,
      page: currentPage,
      pageSize: size,
      totalPages,
    };
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    const db = getDatabase();
    if (db) {
      const { data, error } = await db.from('customers').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (error.code === '22P02') return null; // id không đúng định dạng UUID
        throw new Error(error.message);
      }
      if (!data) return null;
      const expiring = await this.liveExpiringPoints(db, id);
      return { ...(data as Customer), expiring_soon_points: expiring.get(id) || 0 };
    }

    this.syncAllCustomerBalances();
    const c = this.customers.find((item) => item.id === id);
    return c ? { ...c, expiring_soon_points: this.memoryExpiringPoints(c.id) } : null;
  }

  public async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const cleaned = normalizePhone(phone);
    if (!isValidVietnamesePhone(cleaned)) return null;

    const db = getDatabase();
    if (db) {
      const { data, error } = await db.from('customers').select('*').eq('phone', cleaned).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      const expiring = await this.liveExpiringPoints(db, data.id);
      return { ...(data as Customer), expiring_soon_points: expiring.get(data.id) || 0 };
    }

    this.syncAllCustomerBalances();
    const c = this.customers.find((item) => item.phone === cleaned);
    return c ? { ...c, expiring_soon_points: this.memoryExpiringPoints(c.id) } : null;
  }

  public async createCustomer(actor: Actor, phone: string, name: string, email?: string): Promise<Customer> {
    const cleaned = parsePhone(phone);
    const cleanName = name.trim().slice(0, 255);
    if (!cleanName) throw new Error('Họ tên khách hàng là bắt buộc');
    const cleanEmail = email?.trim() || null;

    let customer: Customer;
    const db = getDatabase();
    if (db) {
      const { data, error } = await db
        .from('customers')
        .insert({ phone: cleaned, name: cleanName, email: cleanEmail, status: 'ACTIVE' })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error(`Số điện thoại ${cleaned} đã tồn tại trong hệ thống!`);
        throw new Error(error.message || 'Lỗi tạo khách hàng trên Database');
      }
      customer = data as Customer;
    } else {
      if (this.customers.some((c) => c.phone === cleaned)) {
        throw new Error(`Số điện thoại ${cleaned} đã tồn tại trong hệ thống!`);
      }
      const now = new Date().toISOString();
      customer = {
        id: newLocalId('c'),
        phone: cleaned,
        name: cleanName,
        email: cleanEmail,
        total_points: 0,
        lifetime_points_earned: 0,
        lifetime_points_used: 0,
        status: 'ACTIVE',
        last_transaction_at: null,
        created_at: now,
        updated_at: now,
      };
      this.customers.unshift(customer);
    }

    await activityLogService.logActivity(
      actor,
      'CUSTOMER_CREATE',
      'CUSTOMER',
      customer.id,
      `Tạo khách hàng mới: ${customer.name} (SĐT: ${customer.phone})`,
      { name: customer.name, phone: customer.phone, email: customer.email }
    );
    return customer;
  }

  public async updateCustomer(
    actor: Actor,
    id: string,
    changes: { name?: string; email?: string | null; phone?: string }
  ): Promise<Customer> {
    const updates: Partial<Customer> = { updated_at: new Date().toISOString() };
    if (changes.name !== undefined) {
      const name = changes.name.trim().slice(0, 255);
      if (!name) throw new Error('Họ tên khách hàng là bắt buộc');
      updates.name = name;
    }
    if (changes.email !== undefined) updates.email = changes.email?.trim() || null;
    if (changes.phone !== undefined) updates.phone = parsePhone(changes.phone);

    let customer: Customer;
    const db = getDatabase();
    if (db) {
      const { data, error } = await db.from('customers').update(updates).eq('id', id).select().maybeSingle();
      if (error) {
        if (error.code === '23505') throw new Error(`Số điện thoại ${updates.phone} đã tồn tại trong hệ thống!`);
        throw new Error(error.message || 'Lỗi cập nhật khách hàng trên Database');
      }
      if (!data) throw new Error('Không tìm thấy khách hàng');
      customer = data as Customer;
    } else {
      const existing = this.customers.find((c) => c.id === id);
      if (!existing) throw new Error('Không tìm thấy khách hàng');
      if (updates.phone && this.customers.some((c) => c.id !== id && c.phone === updates.phone)) {
        throw new Error(`Số điện thoại ${updates.phone} đã tồn tại trong hệ thống!`);
      }
      Object.assign(existing, updates);
      customer = { ...existing };
    }

    await activityLogService.logActivity(
      actor,
      'CUSTOMER_UPDATE',
      'CUSTOMER',
      customer.id,
      `Cập nhật thông tin khách hàng: ${customer.name} (SĐT: ${customer.phone})`,
      { name: customer.name, phone: customer.phone, email: customer.email }
    );
    return customer;
  }

  public async deleteCustomer(actor: Actor, id: string): Promise<Customer> {
    const customer = await this.getCustomerById(id);
    if (!customer) throw new Error('Không tìm thấy khách hàng cần xóa');

    const db = getDatabase();
    if (db) {
      const { data: lots, error: lotsError } = await db.from('point_lots').select('id').eq('customer_id', id);
      if (lotsError) throw new Error(lotsError.message);
      if (lots.length > 0) {
        const { error } = await db
          .from('point_redemption_allocations')
          .delete()
          .in('point_lot_id', lots.map((l) => l.id));
        if (error) throw new Error(error.message);
      }
      for (const table of ['point_lots', 'point_transactions'] as const) {
        const { error } = await db.from(table).delete().eq('customer_id', id);
        if (error) throw new Error(error.message);
      }
      const { error } = await db.from('customers').delete().eq('id', id);
      if (error) throw new Error(error.message || 'Lỗi xóa khách hàng trên Database');
    } else {
      const lotIds = new Set(this.lots.filter((l) => l.customer_id === id).map((l) => l.id));
      this.allocations = this.allocations.filter((a) => !lotIds.has(a.point_lot_id));
      this.customers = this.customers.filter((c) => c.id !== id);
      this.lots = this.lots.filter((l) => l.customer_id !== id);
      this.transactions = this.transactions.filter((t) => t.customer_id !== id);
    }

    await activityLogService.logActivity(
      actor,
      'CUSTOMER_DELETE',
      'CUSTOMER',
      id,
      `Xóa khách hàng: ${customer.name} (SĐT: ${customer.phone}) khỏi hệ thống`,
      { id, name: customer.name, phone: customer.phone }
    );
    return customer;
  }

  // ===== POINT LOTS =====

  public async getCustomerLots(customerId: string): Promise<PointLot[]> {
    const db = getDatabase();
    if (db) {
      const { data, error } = await db
        .from('point_lots')
        .select('*')
        .eq('customer_id', customerId)
        .order('expires_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as PointLot[]).map(withDaysLeft);
    }

    return this.lots
      .filter((lot) => lot.customer_id === customerId)
      .map(withDaysLeft)
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  public async getExpiringLots(withinDays = EXPIRING_WINDOW_DAYS): Promise<ExpiringLot[]> {
    const days = Math.min(Math.max(Math.floor(withinDays) || EXPIRING_WINDOW_DAYS, 1), 365);
    const now = new Date();

    const db = getDatabase();
    if (db) {
      const future = new Date(now.getTime() + days * 86400000);
      const rows = await fetchAll<LotRow>((from, to) =>
        db
          .from('point_lots')
          .select('*, customers(*)')
          .eq('status', 'ACTIVE')
          .gt('remaining_points', 0)
          .gt('expires_at', now.toISOString())
          .lte('expires_at', future.toISOString())
          .order('expires_at', { ascending: true })
          .range(from, to)
      );
      return rows.map(({ customers, ...lot }) => ({
        ...withDaysLeft(lot),
        customer: customers ?? undefined,
      }));
    }

    return this.lots
      .filter((lot) => isExpiringWithin(lot, days, now))
      .map((lot) => ({ ...withDaysLeft(lot), customer: this.customers.find((c) => c.id === lot.customer_id) }))
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  // ===== TRANSACTIONS =====

  public async getTransactions(params: {
    customerId?: string;
    type?: string;
    query?: string;
    limit?: number;
  } = {}): Promise<PointTransaction[]> {
    const limit = Math.min(Math.max(Math.floor(params.limit || 500), 1), 1000);
    const type = TRANSACTION_TYPES.find((t) => t === params.type);
    const q = params.query?.trim().toLowerCase() || '';

    let list: PointTransaction[];
    const db = getDatabase();
    if (db) {
      let builder = db
        .from('point_transactions')
        .select('*, customers(name, phone)')
        .order('created_at', { ascending: false })
        // Khi tìm kiếm thì lấy rộng hơn rồi lọc theo tên/SĐT khách (cột của bảng join)
        .limit(q ? 1000 : limit);
      if (params.customerId) builder = builder.eq('customer_id', params.customerId);
      if (type) builder = builder.eq('type', type);

      const { data, error } = await builder;
      if (error) {
        if (error.code === '22P02') return [];
        throw new Error(error.message);
      }
      list = (data as TransactionRow[]).map(toTransaction);
    } else {
      list = this.transactions
        .filter((t) => (!params.customerId || t.customer_id === params.customerId) && (!type || t.type === type))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (q) {
      list = list.filter(
        (t) =>
          t.customer_name?.toLowerCase().includes(q) ||
          t.customer_phone?.includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.reference_id?.toLowerCase().includes(q)
      );
    }
    return list.slice(0, limit);
  }

  public async getTransactionsPaginated(params: {
    customerId?: string;
    type?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedTransactions> {
    const page = Math.max(1, Math.floor(params.page || 1));
    const pageSize = Math.min(Math.max(1, Math.floor(params.pageSize || 20)), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const type = TRANSACTION_TYPES.find((t) => t === params.type);
    const q = params.query?.trim() || '';

    const db = getDatabase();
    if (db) {
      let customerIdsForQuery: string[] = [];
      if (q) {
        const safeSearch = toSafeFilterText(q);
        if (safeSearch) {
          const { data: matchedCustomers } = await db
            .from('customers')
            .select('id')
            .or(`phone.ilike.%${safeSearch}%,name.ilike.%${safeSearch}%`)
            .limit(100);
          customerIdsForQuery = (matchedCustomers || []).map((c) => c.id);
        }
      }

      let builder = db
        .from('point_transactions')
        .select('*, customers(name, phone)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (params.customerId) builder = builder.eq('customer_id', params.customerId);
      if (type) builder = builder.eq('type', type);

      if (q) {
        const safeQ = toSafeFilterText(q);
        if (customerIdsForQuery.length > 0) {
          builder = builder.or(
            `description.ilike.%${safeQ}%,reference_id.ilike.%${safeQ}%,customer_id.in.(${customerIdsForQuery.join(',')})`
          );
        } else if (safeQ) {
          builder = builder.or(`description.ilike.%${safeQ}%,reference_id.ilike.%${safeQ}%`);
        }
      }

      builder = builder.range(from, to);

      const { data, count, error } = await builder;
      if (error) {
        if (error.code === '22P02') {
          return { transactions: [], total: 0, page, pageSize, totalPages: 1 };
        }
        throw new Error(error.message);
      }

      const transactions = ((data as TransactionRow[]) || []).map(toTransaction);
      const total = count ?? transactions.length;
      const totalPages = Math.ceil(total / pageSize) || 1;

      return {
        transactions,
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    // In-memory fallback
    let filtered = this.transactions
      .filter((t) => (!params.customerId || t.customer_id === params.customerId) && (!type || t.type === type));

    if (q) {
      const queryLower = q.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.customer_name?.toLowerCase().includes(queryLower) ||
          t.customer_phone?.includes(queryLower) ||
          t.description?.toLowerCase().includes(queryLower) ||
          t.reference_id?.toLowerCase().includes(queryLower)
      );
    }

    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const transactions = filtered.slice(from, to + 1);

    return {
      transactions,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  // ===== EARN (CỘNG ĐIỂM) =====

  public async earnPoints(actor: Actor, input: EarnPointsInput): Promise<EarnPointsResult> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Số tiền thanh toán phải lớn hơn 0');
    if (amount > 10_000_000_000) throw new Error('Số tiền thanh toán vượt quá giới hạn cho phép');

    const phone = parsePhone(input.phone);
    const settings = await this.getPointSettings();
    const { bonusPoints, matchedTier } = calculateBonusPoints(amount, settings.bonus_tiers);
    const bonusDesc = matchedTier
      ? ` + Thưởng mốc ${matchedTier.label || `${(matchedTier.minAmount / 1000000).toFixed(0)}tr`} (+${bonusPoints}đ)`
      : '';
    const description = cleanText(input.description, 'Tích điểm thanh toán tiền sân') + bonusDesc;
    const referenceType = cleanText(input.referenceType, 'BOOKING').slice(0, 50);
    const referenceId = input.referenceId?.trim().slice(0, 100) || null;
    const nowIso = new Date().toISOString();

    let customer: Customer;
    let transaction: PointTransaction;
    let lot: PointLot;
    let basePoints: number;

    const db = getDatabase();
    if (db) {
      const { data, error } = await db.rpc('earn_points_atomic', {
        p_phone: phone,
        p_name: input.name?.trim().slice(0, 255) || '',
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_created_by: actor.username,
      });
      if (error) throw new Error(error.message || 'Lỗi tích điểm trên Database');

      basePoints = data.points_earned;
      if (bonusPoints > 0) {
        const { error: bonusError } = await db.rpc('adjust_points_atomic', {
          p_customer_id: data.customer_id,
          p_points_delta: bonusPoints,
          p_reason: `Điểm thưởng mốc hóa đơn: ${matchedTier?.label || 'Mốc hóa đơn'} (+${bonusPoints} điểm)`,
          p_created_by: actor.username,
        });
        if (bonusError) console.error('Lỗi cộng điểm thưởng mốc:', bonusError.message);
      }

      customer = await this.liveCustomerOrThrow(db, data.customer_id);
      transaction = {
        id: data.transaction_id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        type: 'EARN',
        points: basePoints + bonusPoints,
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        created_by: actor.username,
        created_at: nowIso,
      };
      lot = {
        id: data.point_lot_id,
        customer_id: customer.id,
        transaction_id: data.transaction_id,
        original_points: basePoints,
        remaining_points: basePoints,
        earned_at: nowIso,
        expires_at: data.expires_at,
        status: 'ACTIVE',
        created_at: nowIso,
        updated_at: nowIso,
      };
    } else {
      basePoints = calculatePoints(amount, settings.amount_per_point, settings.points_per_amount, settings.rounding_mode);
      const pointsEarned = basePoints + bonusPoints;

      let existing = this.customers.find((c) => c.phone === phone);
      if (!existing) {
        await this.createCustomer(actor, phone, input.name || 'Khách hàng mới');
        existing = this.customers.find((c) => c.phone === phone)!;
      } else if (input.name?.trim()) {
        existing.name = input.name.trim();
      }

      transaction = {
        id: newLocalId('tx'),
        customer_id: existing.id,
        customer_name: existing.name,
        customer_phone: existing.phone,
        type: 'EARN',
        points: pointsEarned,
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        created_by: actor.username,
        created_at: nowIso,
      };
      lot = {
        id: newLocalId('lot'),
        customer_id: existing.id,
        transaction_id: transaction.id,
        original_points: pointsEarned,
        remaining_points: pointsEarned,
        earned_at: nowIso,
        expires_at: calculateExpiryDate(settings.expiry_days).toISOString(),
        status: 'ACTIVE',
        created_at: nowIso,
        updated_at: nowIso,
      };

      existing.lifetime_points_earned += pointsEarned;
      existing.last_transaction_at = nowIso;
      existing.updated_at = nowIso;
      this.transactions.unshift(transaction);
      this.lots.unshift(lot);
      this.syncAllCustomerBalances();
      customer = { ...existing };
    }

    const pointsEarned = basePoints + bonusPoints;
    await activityLogService.logActivity(
      actor,
      'POINTS_EARN',
      'POINT_TRANSACTION',
      transaction.id,
      `Tích +${pointsEarned.toLocaleString('vi-VN')} điểm cho khách hàng ${customer.name} (SĐT: ${customer.phone}) từ hóa đơn ${amount.toLocaleString('vi-VN')}đ${matchedTier ? ` (bao gồm ${bonusPoints} điểm thưởng mốc)` : ''}`,
      { phone: customer.phone, name: customer.name, points: pointsEarned, basePoints, bonusPoints, amount, transactionId: transaction.id }
    );

    return {
      success: true,
      pointsEarned,
      newTotalPoints: customer.total_points,
      customer,
      transaction,
      lot,
    };
  }

  // ===== REDEEM (TRỪ ĐIỂM FEFO) =====

  public async redeemPoints(actor: Actor, input: RedeemPointsInput): Promise<RedeemPointsResult> {
    const points = Number(input.points);
    if (!Number.isInteger(points) || points <= 0) throw new Error('Số điểm sử dụng phải là số nguyên lớn hơn 0');

    const description = cleanText(input.description, 'Sử dụng điểm đổi ưu đãi / giảm giá tiền sân');
    const referenceType = cleanText(input.referenceType, 'POS_ORDER').slice(0, 50);
    const referenceId = input.referenceId?.trim().slice(0, 100) || null;
    const nowIso = new Date().toISOString();

    let customer: Customer;
    let transaction: PointTransaction;
    let allocations: PointRedemptionAllocation[];

    const db = getDatabase();
    if (db) {
      const { data, error } = await db.rpc('redeem_points_fefo_atomic', {
        p_customer_id: input.customerId,
        p_points_to_redeem: points,
        p_description: description,
        p_created_by: actor.username,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
      });
      if (error) throw new Error(error.message || 'Lỗi trừ điểm trên Database');

      customer = await this.liveCustomerOrThrow(db, input.customerId);
      transaction = {
        id: data.transaction_id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        type: 'REDEEM',
        points: -points,
        amount: 0,
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        created_by: actor.username,
        created_at: nowIso,
      };
      allocations = ((data.allocations || []) as RpcAllocation[]).map((a) => ({
        id: `${data.transaction_id}-${a.lot_id}`,
        redemption_transaction_id: data.transaction_id,
        point_lot_id: a.lot_id,
        points_used: a.points_deducted,
        created_at: nowIso,
      }));
    } else {
      const existing = this.customers.find((c) => c.id === input.customerId);
      if (!existing) throw new Error('Không tìm thấy khách hàng');

      const now = new Date();
      const validLots = this.lots
        .filter((l) => l.customer_id === existing.id && isActiveUnexpired(l, now))
        .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
      const available = validLots.reduce((sum, l) => sum + l.remaining_points, 0);
      if (available < points) {
        throw new Error(
          `Số điểm khả dụng (${available} điểm) không đủ để sử dụng ${points} điểm (hoặc một số điểm đã hết hạn)!`
        );
      }

      transaction = {
        id: newLocalId('tx'),
        customer_id: existing.id,
        customer_name: existing.name,
        customer_phone: existing.phone,
        type: 'REDEEM',
        points: -points,
        amount: 0,
        reference_type: referenceType,
        reference_id: referenceId,
        description,
        created_by: actor.username,
        created_at: nowIso,
      };

      // FEFO: trừ từ lô sắp hết hạn trước
      allocations = [];
      let needed = points;
      for (const lot of validLots) {
        const deduct = Math.min(lot.remaining_points, needed);
        lot.remaining_points -= deduct;
        if (lot.remaining_points === 0) lot.status = 'FULLY_USED';
        lot.updated_at = nowIso;
        allocations.push({
          id: newLocalId('alloc'),
          redemption_transaction_id: transaction.id,
          point_lot_id: lot.id,
          points_used: deduct,
          created_at: nowIso,
        });
        needed -= deduct;
        if (needed === 0) break;
      }

      this.allocations.push(...allocations);
      this.transactions.unshift(transaction);
      existing.lifetime_points_used += points;
      existing.last_transaction_at = nowIso;
      existing.updated_at = nowIso;
      this.syncAllCustomerBalances();
      customer = { ...existing };
    }

    await activityLogService.logActivity(
      actor,
      'POINTS_REDEEM',
      'POINT_TRANSACTION',
      transaction.id,
      `Khách hàng ${customer.name} (SĐT: ${customer.phone}) đã sử dụng -${points.toLocaleString('vi-VN')} điểm`,
      { phone: customer.phone, name: customer.name, points, transactionId: transaction.id, newBalance: customer.total_points }
    );

    return {
      success: true,
      pointsRedeemed: points,
      newTotalPoints: customer.total_points,
      customer,
      transaction,
      allocations,
    };
  }

  // ===== ADJUST (ADMIN) =====

  public async adjustPoints(actor: Actor, input: AdjustPointsInput): Promise<AdjustPointsResult> {
    const delta = Number(input.pointsDelta);
    if (!Number.isInteger(delta) || delta === 0) throw new Error('Số điểm điều chỉnh phải là số nguyên khác 0');
    const reason = input.reason?.trim().slice(0, MAX_TEXT_LENGTH);
    if (!reason) throw new Error('Lý do điều chỉnh điểm là bắt buộc (Audit log)');

    const nowIso = new Date().toISOString();
    let customer: Customer;
    let transaction: PointTransaction;

    const db = getDatabase();
    if (db) {
      const { data, error } = await db.rpc('adjust_points_atomic', {
        p_customer_id: input.customerId,
        p_points_delta: delta,
        p_reason: reason,
        p_created_by: actor.username,
      });
      if (error) throw new Error(error.message || 'Lỗi điều chỉnh điểm trên Database');

      customer = await this.liveCustomerOrThrow(db, input.customerId);
      transaction = {
        id: data.transaction_id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        type: 'ADJUST',
        points: delta,
        amount: 0,
        reference_type: 'ADJUSTMENT',
        description: reason,
        created_by: actor.username,
        created_at: nowIso,
      };
    } else {
      const existing = this.customers.find((c) => c.id === input.customerId);
      if (!existing) throw new Error('Không tìm thấy khách hàng');
      if (delta < 0 && existing.total_points + delta < 0) {
        throw new Error(`Số điểm điều chỉnh (${delta}) làm số dư của khách bị âm (hiện có: ${existing.total_points})!`);
      }

      transaction = {
        id: newLocalId('tx'),
        customer_id: existing.id,
        customer_name: existing.name,
        customer_phone: existing.phone,
        type: 'ADJUST',
        points: delta,
        amount: 0,
        reference_type: 'ADJUSTMENT',
        description: reason,
        created_by: actor.username,
        created_at: nowIso,
      };

      if (delta > 0) {
        const settings = await this.getPointSettings();
        this.lots.unshift({
          id: newLocalId('lot'),
          customer_id: existing.id,
          transaction_id: transaction.id,
          original_points: delta,
          remaining_points: delta,
          earned_at: nowIso,
          expires_at: calculateExpiryDate(settings.expiry_days).toISOString(),
          status: 'ACTIVE',
          created_at: nowIso,
          updated_at: nowIso,
        });
        existing.lifetime_points_earned += delta;
      } else {
        await this.redeemPoints(actor, {
          customerId: existing.id,
          points: Math.abs(delta),
          description: `Điều chỉnh giảm điểm: ${reason}`,
          referenceType: 'ADJUSTMENT',
          referenceId: transaction.id,
        });
      }

      existing.last_transaction_at = nowIso;
      existing.updated_at = nowIso;
      this.transactions.unshift(transaction);
      this.syncAllCustomerBalances();
      customer = { ...existing };
    }

    await activityLogService.logActivity(
      actor,
      'POINTS_ADJUST',
      'POINT_TRANSACTION',
      transaction.id,
      `Điều chỉnh ${delta > 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} điểm cho khách hàng ${customer.name}. Lý do: ${reason}`,
      { phone: customer.phone, name: customer.name, pointsDelta: delta, reason, newBalance: customer.total_points }
    );

    return { success: true, pointsDelta: delta, newTotalPoints: customer.total_points, customer, transaction };
  }

  // ===== EXPIRE =====

  public async checkAndExpireLots(actor: Actor): Promise<ExpireCheckResult> {
    let lotsExpired = 0;
    let totalPointsExpired = 0;

    const db = getDatabase();
    if (db) {
      const { data, error } = await db.rpc('expire_points_atomic');
      if (error) throw new Error(error.message || 'Lỗi quét điểm hết hạn trên Database');
      lotsExpired = data.lots_expired_count;
      totalPointsExpired = data.total_points_expired;
    } else {
      const now = new Date();
      for (const lot of this.lots) {
        if (lot.status === 'ACTIVE' && lot.remaining_points > 0 && new Date(lot.expires_at) <= now) {
          this.transactions.unshift({
            id: newLocalId('tx'),
            customer_id: lot.customer_id,
            type: 'EXPIRE',
            points: -lot.remaining_points,
            amount: 0,
            reference_type: 'EXPIRATION_BATCH',
            reference_id: lot.id,
            description: 'Điểm hết hạn tự động',
            created_by: 'SYSTEM',
            created_at: now.toISOString(),
          });
          totalPointsExpired += lot.remaining_points;
          lotsExpired += 1;
          lot.status = 'EXPIRED';
          lot.updated_at = now.toISOString();
        }
      }
      this.syncAllCustomerBalances();
    }

    const message = `Đã xử lý hết hạn ${lotsExpired} lô điểm (tổng ${totalPointsExpired} điểm)`;
    await activityLogService.logActivity(actor, 'EXPIRE_CHECK', 'POINT_TRANSACTION', null, message, {
      lotsExpired,
      totalPointsExpired,
    });
    return { success: true, lotsExpired, totalPointsExpired, message };
  }

  // ===== DASHBOARD =====

  public async getDashboardStats(): Promise<DashboardStats> {
    const expiringLots = await this.getExpiringLots(EXPIRING_WINDOW_DAYS);
    const expiringPoints = expiringLots.reduce((sum, l) => sum + l.remaining_points, 0);

    const db = getDatabase();
    if (db) {
      const [customers, transactions] = await Promise.all([
        fetchAll<Pick<Customer, 'total_points'>>((from, to) =>
          db.from('customers').select('total_points').range(from, to)
        ),
        fetchAll<Pick<PointTransaction, 'type' | 'points'>>((from, to) =>
          db.from('point_transactions').select('type, points').range(from, to)
        ),
      ]);
      return computeStats(customers, transactions, expiringPoints);
    }

    this.syncAllCustomerBalances();
    return computeStats(this.customers, this.transactions, expiringPoints);
  }

  public async getChartData(period: ChartPeriod = '7d'): Promise<ChartDataPoint[]> {
    const start = chartStartDate(period);

    const db = getDatabase();
    if (db) {
      const transactions = await fetchAll<Pick<PointTransaction, 'type' | 'points' | 'created_at'>>((from, to) =>
        db
          .from('point_transactions')
          .select('type, points, created_at')
          .gte('created_at', start.toISOString())
          .range(from, to)
      );
      return buildChart(period, transactions);
    }

    return buildChart(
      period,
      this.transactions.filter((t) => new Date(t.created_at) >= start)
    );
  }

  // ===== TRA CỨU CÔNG KHAI =====

  public async getPublicLookup(phone: string): Promise<PublicLookupResult | null> {
    const customer = await this.getCustomerByPhone(phone);
    if (!customer) return null;

    const [lots, recent, earnTransactions, settings] = await Promise.all([
      this.getCustomerLots(customer.id),
      this.getTransactions({ customerId: customer.id, limit: 15 }),
      this.getTransactions({ customerId: customer.id, type: 'EARN', limit: 1000 }),
      this.getPointSettings(),
    ]);

    const cashPerPoint = settings.cash_per_point || 1000;
    const paidFromTransactions = earnTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const totalAmountPaid =
      paidFromTransactions > 0
        ? paidFromTransactions
        : (customer.lifetime_points_earned || 0) * (settings.amount_per_point / settings.points_per_amount);
    const now = new Date();

    return {
      success: true,
      customer: {
        name: customer.name,
        phone: customer.phone,
        total_points: customer.total_points,
        lifetime_points_used: customer.lifetime_points_used,
        expiring_soon_points: customer.expiring_soon_points,
      },
      lots: lots
        .filter((l) => isActiveUnexpired(l, now))
        .map((l) => ({
          id: l.id,
          original_points: l.original_points,
          remaining_points: l.remaining_points,
          earned_at: l.earned_at,
          expires_at: l.expires_at,
          days_left: l.days_left,
        })),
      transactions: recent.map((t) => ({
        id: t.id,
        type: t.type,
        points: t.points,
        amount: t.amount,
        description: t.description,
        created_at: t.created_at,
      })),
      settings: {
        amount_per_point: settings.amount_per_point,
        points_per_amount: settings.points_per_amount,
        cash_per_point: cashPerPoint,
        expiry_days: settings.expiry_days,
      },
      cash_value: Math.floor(customer.total_points * cashPerPoint),
      total_amount_paid: totalAmountPaid,
    };
  }
}

export const loyaltyStore = new LoyaltyStore();
