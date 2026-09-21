export type TransactionType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'ADJUST' | 'REFUND';
export type LotStatus = 'ACTIVE' | 'FULLY_USED' | 'EXPIRED';
export type RoundingMode = 'FLOOR' | 'ROUND' | 'CEIL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type UserRole = 'ADMIN' | 'STAFF';

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_REGISTER'
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

export interface ActivityLog {
  id: string;
  user_id?: string | null;
  username: string;
  user_role: UserRole;
  action: ActivityAction;
  entity_type: 'AUTH' | 'CUSTOMER' | 'POINT_TRANSACTION' | 'POINT_SETTING';
  entity_id?: string | null;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
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
