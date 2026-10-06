export type TransactionType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REFUND';
export type LotStatus = 'ACTIVE' | 'FULLY_USED' | 'EXPIRED';
export type RoundingMode = 'FLOOR' | 'ROUND' | 'CEIL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type UserRole = 'ADMIN' | 'STAFF';

/**
 * Mốc thưởng điểm theo giá trị hóa đơn.
 * Ví dụ: hóa đơn >= 1.000.000đ → +50 bonus điểm.
 * Logic: Áp dụng mốc CAO NHẤT mà amount đạt được.
 */
export interface BonusTier {
  id: string;           // UUID hoặc random string
  minAmount: number;    // Ngưỡng hóa đơn tối thiểu (đVNĐ)
  bonusPoints: number;  // Số điểm thưởng thêm
  label?: string;       // Nhãn hiển thị (tùy chọn)
}

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_REGISTER'
  | 'USER_UPDATE_ROLE'
  | 'USER_STATUS_CHANGE'
  | 'USER_RESET_PASSWORD'
  | 'USER_DELETE'
  | 'CUSTOMER_CREATE'
  | 'CUSTOMER_UPDATE'
  | 'CUSTOMER_DELETE'
  | 'POINTS_EARN'
  | 'POINTS_REDEEM'
  | 'POINTS_ADJUST'
  | 'SETTINGS_UPDATE'
  | 'EXPIRE_CHECK';

export interface AppUser {
  id: string;
  username: string;
  email?: string | null;
  name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
}

/** Người thực hiện thao tác — lấy từ session phía server, không nhận từ client */
export type Actor = Pick<AppUser, 'id' | 'username' | 'name' | 'role'>;

export type ActivityEntityType = 'AUTH' | 'CUSTOMER' | 'POINT_TRANSACTION' | 'POINT_SETTING';

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  username: string;
  user_role: UserRole;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ActivityLogFilter {
  action?: string;
  role?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface Customer {
  id: string;
  phone: string;
  name: string;
  email?: string | null;
  total_points: number;
  lifetime_points_earned: number;
  lifetime_points_used: number;
  status: CustomerStatus;
  last_transaction_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed / UI helper
  expiring_soon_points?: number;
}

export interface PointSetting {
  id: string;
  amount_per_point: number;
  points_per_amount: number;
  rounding_mode: RoundingMode;
  expiry_days: number;
  is_active: boolean;
  updated_by: string;
  created_at: string;
  updated_at: string;
  /** Mốc thưởng điểm theo giá trị hóa đơn */
  bonus_tiers?: BonusTier[];
  /** Giá trị tiền mặt quy đổi tương ứng với 1 điểm thưởng (VNĐ) */
  cash_per_point?: number;
}

export interface PointTransaction {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  type: TransactionType;
  points: number; // positive or negative
  amount: number;
  reference_type: string;
  reference_id?: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
  allocations?: PointRedemptionAllocation[];
}

export interface PointLot {
  id: string;
  customer_id: string;
  transaction_id: string;
  original_points: number;
  remaining_points: number;
  earned_at: string;
  expires_at: string;
  status: LotStatus;
  created_at: string;
  updated_at: string;
  // UI helper
  days_left?: number;
}

export interface PointRedemptionAllocation {
  id: string;
  redemption_transaction_id: string;
  point_lot_id: string;
  points_used: number;
  created_at: string;
  point_lot?: PointLot;
}

export interface DashboardStats {
  totalCustomers: number;
  customersWithPoints: number;
  circulatingPoints: number;
  totalEarnedPoints: number;
  totalUsedPoints: number;
  totalExpiredPoints: number;
  expiringIn30Days: number;
}

export interface ChartDataPoint {
  date: string;
  label: string;
  earned: number;
  redeemed: number;
  expired: number;
}

export type ChartPeriod = '7d' | '30d' | '12m';

export type CustomerFilter = 'ALL' | 'HAS_POINTS' | 'NO_POINTS' | 'EXPIRING_SOON' | 'EXPIRED';

export type ExpiringLot = PointLot & { customer?: Customer };

export interface CustomerDetail extends Customer {
  lots: PointLot[];
  transactions: PointTransaction[];
}

/** Các trường cấu hình ADMIN được phép sửa */
export type PointSettingUpdate = Partial<
  Pick<
    PointSetting,
    'amount_per_point' | 'points_per_amount' | 'cash_per_point' | 'expiry_days' | 'bonus_tiers'
  >
>;

export interface EarnPointsInput {
  phone: string;
  amount: number;
  name?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface EarnPointsResult {
  success: true;
  pointsEarned: number;
  newTotalPoints: number;
  customer: Customer;
  transaction: PointTransaction;
  lot: PointLot;
}

export interface RedeemPointsInput {
  customerId: string;
  points: number;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface RedeemPointsResult {
  success: true;
  pointsRedeemed: number;
  newTotalPoints: number;
  customer: Customer;
  transaction: PointTransaction;
  allocations: PointRedemptionAllocation[];
}

export interface AdjustPointsInput {
  customerId: string;
  pointsDelta: number;
  reason: string;
}

export interface AdjustPointsResult {
  success: true;
  pointsDelta: number;
  newTotalPoints: number;
  customer: Customer;
  transaction: PointTransaction;
}

export interface ExpireCheckResult {
  success: true;
  lotsExpired: number;
  totalPointsExpired: number;
  message: string;
}

export interface CreateUserInput {
  username: string;
  name: string;
  email?: string;
  password: string;
  role?: UserRole;
}

export interface UserListResult {
  users: AppUser[];
  databaseReady: boolean;
}

/** Dữ liệu tối thiểu trả cho trang tra cứu công khai (không lộ email, id nội bộ, người thao tác) */
export interface PublicLookupResult {
  success: true;
  customer: Pick<
    Customer,
    'name' | 'phone' | 'total_points' | 'lifetime_points_used' | 'expiring_soon_points'
  >;
  lots: Pick<
    PointLot,
    'id' | 'original_points' | 'remaining_points' | 'earned_at' | 'expires_at' | 'days_left'
  >[];
  transactions: Pick<
    PointTransaction,
    'id' | 'type' | 'points' | 'amount' | 'description' | 'created_at'
  >[];
  settings: {
    amount_per_point: number;
    points_per_amount: number;
    cash_per_point: number;
    expiry_days: number;
  };
  cash_value: number;
  total_amount_paid: number;
}

export interface PaginatedCustomers {
  customers: Customer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedTransactions {
  transactions: PointTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

