import { supabase } from '@/lib/supabase/client';
import {
  Customer,
  PointSetting,
  PointTransaction,
  PointLot,
  PointRedemptionAllocation,
  DashboardStats,
  ChartDataPoint,
  UserRole,
} from '@/types/database';
import { calculatePoints, calculateExpiryDate, getDaysUntilExpiry } from '@/lib/points-engine';

// Initial default settings
export const DEFAULT_SETTING: PointSetting = {
  id: 'default-setting-01',
  amount_per_point: 10000,
  points_per_amount: 1,
  rounding_mode: 'FLOOR',
  expiry_days: 90,
  is_active: true,
  updated_by: 'HỆ THỐNG',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Seed 10 Customers with detailed point lots & transactions for instant testing
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c-01',
    phone: '0901234567',
    name: 'Nguyễn Văn An',
    email: 'an.nguyen@example.com',
    total_points: 1000,
    lifetime_points_earned: 1200,
    lifetime_points_used: 200,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'c-02',
    phone: '0912345678',
    name: 'Trần Thị Bích',
    email: 'bich.tran@example.com',
    total_points: 500,
    lifetime_points_earned: 500,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'c-03',
    phone: '0923456789',
    name: 'Lê Hoàng Cường',
    email: 'cuong.le@example.com',
    total_points: 100,
    lifetime_points_earned: 100,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 85 * 86400000).toISOString(),
  },
  {
    id: 'c-04',
    phone: '0934567890',
    name: 'Phạm Minh Đức',
    email: 'duc.pham@example.com',
    total_points: 0,
    lifetime_points_earned: 0,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: null,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'c-05',
    phone: '0945678901',
    name: 'Võ Quốc Hùng',
    email: 'hung.vo@example.com',
    total_points: 350,
    lifetime_points_earned: 350,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'c-06',
    phone: '0956789012',
    name: 'Đặng Thu Hương',
    email: 'huong.dang@example.com',
    total_points: 0,
    lifetime_points_earned: 200,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'c-07',
    phone: '0967890123',
    name: 'Bùi Thanh Long',
    email: 'long.bui@example.com',
    total_points: 850,
    lifetime_points_earned: 1000,
    lifetime_points_used: 150,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'c-08',
    phone: '0978901234',
    name: 'Đỗ Mỹ Linh',
    email: 'linh.do@example.com',
    total_points: 200,
    lifetime_points_earned: 200,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
  {
    id: 'c-09',
    phone: '0989012345',
    name: 'Ngô Gia Bảo',
    email: 'bao.ngo@example.com',
    total_points: 600,
    lifetime_points_earned: 600,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    id: 'c-10',
    phone: '0990123456',
    name: 'Hoàng Yến Nhi',
    email: 'nhi.hoang@example.com',
    total_points: 0,
    lifetime_points_earned: 0,
    lifetime_points_used: 0,
    status: 'ACTIVE',
    last_transaction_at: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const INITIAL_LOTS: PointLot[] = [
  // Nguyễn Văn An (1000 pts = lot 300 left + lot 700)
  {
    id: 'lot-01',
    customer_id: 'c-01',
    transaction_id: 'tx-01',
    original_points: 500,
    remaining_points: 300,
    earned_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'lot-02',
    customer_id: 'c-01',
    transaction_id: 'tx-03',
    original_points: 700,
    remaining_points: 700,
    earned_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 75 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  // Trần Thị Bích (500 pts)
  {
    id: 'lot-03',
    customer_id: 'c-02',
    transaction_id: 'tx-04',
    original_points: 500,
    remaining_points: 500,
    earned_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  // Lê Hoàng Cường (100 pts, expiring in 5 days!)
  {
    id: 'lot-04',
    customer_id: 'c-03',
    transaction_id: 'tx-05',
    original_points: 100,
    remaining_points: 100,
    earned_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 85 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 85 * 86400000).toISOString(),
  },
  // Võ Quốc Hùng (150 pts in 10 days + 200 pts in 80 days)
  {
    id: 'lot-05',
    customer_id: 'c-05',
    transaction_id: 'tx-06',
    original_points: 150,
    remaining_points: 150,
    earned_at: new Date(Date.now() - 80 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 80 * 86400000).toISOString(),
  },
  {
    id: 'lot-06',
    customer_id: 'c-05',
    transaction_id: 'tx-07',
    original_points: 200,
    remaining_points: 200,
    earned_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 80 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  // Đặng Thu Hương (Expired 200 pts)
  {
    id: 'lot-07',
    customer_id: 'c-06',
    transaction_id: 'tx-08',
    original_points: 200,
    remaining_points: 0,
    earned_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    expires_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: 'EXPIRED',
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  // Bùi Thanh Long (850 pts = 650 + 50 + 150)
  {
    id: 'lot-08',
    customer_id: 'c-07',
    transaction_id: 'tx-09',
    original_points: 800,
    remaining_points: 650,
    earned_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 50 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'lot-09',
    customer_id: 'c-07',
    transaction_id: 'tx-11',
    original_points: 50,
    remaining_points: 50,
    earned_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 80 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'lot-10',
    customer_id: 'c-07',
    transaction_id: 'tx-12',
    original_points: 150,
    remaining_points: 150,
    earned_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 88 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  // Đỗ Mỹ Linh (200 pts, 25 days left)
  {
    id: 'lot-11',
    customer_id: 'c-08',
    transaction_id: 'tx-13',
    original_points: 200,
    remaining_points: 200,
    earned_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 25 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
  // Ngô Gia Bảo (600 pts, 72 days left)
  {
    id: 'lot-12',
    customer_id: 'c-09',
    transaction_id: 'tx-14',
    original_points: 600,
    remaining_points: 600,
    earned_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 72 * 86400000).toISOString(),
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
];

const INITIAL_TRANSACTIONS: PointTransaction[] = [
  {
    id: 'tx-01',
    customer_id: 'c-01',
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0901234567',
    type: 'EARN',
    points: 500,
    amount: 5000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-701',
    description: 'Thanh toán tiền sân tháng 7',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: 'tx-02',
    customer_id: 'c-01',
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0901234567',
    type: 'REDEEM',
    points: -200,
    amount: 0,
    reference_type: 'POS_ORDER',
    reference_id: 'ORD-102',
    description: 'Đổi nước uống và cầu Yonex',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'tx-03',
    customer_id: 'c-01',
    customer_name: 'Nguyễn Văn An',
    customer_phone: '0901234567',
    type: 'EARN',
    points: 700,
    amount: 7000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-850',
    description: 'Thanh toán gói sân cố định quý 3',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 'tx-04',
    customer_id: 'c-02',
    customer_name: 'Trần Thị Bích',
    customer_phone: '0912345678',
    type: 'EARN',
    points: 500,
    amount: 5000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-789',
    description: 'Thanh toán sân đôi cuối tuần',
    created_by: 'STAFF_LAN',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'tx-05',
    customer_id: 'c-03',
    customer_name: 'Lê Hoàng Cường',
    customer_phone: '0923456789',
    type: 'EARN',
    points: 100,
    amount: 1000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-650',
    description: 'Thuê sân giao lưu CLB',
    created_by: 'STAFF_LAN',
    created_at: new Date(Date.now() - 85 * 86400000).toISOString(),
  },
  {
    id: 'tx-06',
    customer_id: 'c-05',
    customer_name: 'Võ Quốc Hùng',
    customer_phone: '0945678901',
    type: 'EARN',
    points: 150,
    amount: 1500000,
    reference_type: 'BOOKING',
    reference_id: 'BK-710',
    description: 'Tiền sân thứ 3, 5, 7',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 80 * 86400000).toISOString(),
  },
  {
    id: 'tx-07',
    customer_id: 'c-05',
    customer_name: 'Võ Quốc Hùng',
    customer_phone: '0945678901',
    type: 'EARN',
    points: 200,
    amount: 2000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-912',
    description: 'Tiền sân cuối tuần',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'tx-08',
    customer_id: 'c-06',
    customer_name: 'Đặng Thu Hương',
    customer_phone: '0956789012',
    type: 'EARN',
    points: 200,
    amount: 2000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-520',
    description: 'Tiền sân giải nội bộ',
    created_by: 'STAFF_LAN',
    created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
  },
  {
    id: 'tx-09',
    customer_id: 'c-06',
    customer_name: 'Đặng Thu Hương',
    customer_phone: '0956789012',
    type: 'EXPIRE',
    points: -200,
    amount: 0,
    reference_type: 'EXPIRATION_BATCH',
    reference_id: 'EXP-101',
    description: 'Điểm hết hạn tự động (quá 90 ngày)',
    created_by: 'HỆ THỐNG',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'tx-10',
    customer_id: 'c-07',
    customer_name: 'Bùi Thanh Long',
    customer_phone: '0967890123',
    type: 'EARN',
    points: 800,
    amount: 8000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-730',
    description: 'Đăng ký vé tháng sân 1',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: 'tx-11',
    customer_id: 'c-07',
    customer_name: 'Bùi Thanh Long',
    customer_phone: '0967890123',
    type: 'REDEEM',
    points: -150,
    amount: 0,
    reference_type: 'POS_ORDER',
    reference_id: 'ORD-210',
    description: 'Trừ điểm thanh toán nước tăng lực',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'tx-12',
    customer_id: 'c-07',
    customer_name: 'Bùi Thanh Long',
    customer_phone: '0967890123',
    type: 'REFUND',
    points: 50,
    amount: 0,
    reference_type: 'REFUND',
    reference_id: 'RF-105',
    description: 'Hoàn điểm do huỷ giờ sân mưa bão',
    created_by: 'ADMIN',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 'tx-13',
    customer_id: 'c-07',
    customer_name: 'Bùi Thanh Long',
    customer_phone: '0967890123',
    type: 'ADJUST',
    points: 150,
    amount: 0,
    reference_type: 'ADJUSTMENT',
    reference_id: 'ADJ-002',
    description: 'Thưởng điểm hội viên tích cực',
    created_by: 'ADMIN',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'tx-14',
    customer_id: 'c-08',
    customer_name: 'Đỗ Mỹ Linh',
    customer_phone: '0978901234',
    type: 'EARN',
    points: 200,
    amount: 2000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-890',
    description: 'Tiền sân lớp năng khiếu',
    created_by: 'STAFF_LAN',
    created_at: new Date(Date.now() - 65 * 86400000).toISOString(),
  },
  {
    id: 'tx-15',
    customer_id: 'c-09',
    customer_name: 'Ngô Gia Bảo',
    customer_phone: '0989012345',
    type: 'EARN',
    points: 600,
    amount: 6000000,
    reference_type: 'BOOKING',
    reference_id: 'BK-940',
    description: 'Thuê sân giải phong trào',
    created_by: 'STAFF_HUY',
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
];

const INITIAL_ALLOCATIONS: PointRedemptionAllocation[] = [
  {
    id: 'alloc-01',
    redemption_transaction_id: 'tx-02',
    point_lot_id: 'lot-01',
    points_used: 200,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'alloc-02',
    redemption_transaction_id: 'tx-11',
    point_lot_id: 'lot-08',
    points_used: 150,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

// In-memory / browser store instance
class LoyaltyStore {
  private customers: Customer[] = [...INITIAL_CUSTOMERS];
  private lots: PointLot[] = [...INITIAL_LOTS];
  private transactions: PointTransaction[] = [...INITIAL_TRANSACTIONS];
  private allocations: PointRedemptionAllocation[] = [...INITIAL_ALLOCATIONS];
  private settings: PointSetting = { ...DEFAULT_SETTING };
  private currentRole: UserRole = 'ADMIN';
  private hasCheckedSupabase: boolean = false;
  private isSupabaseLive: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private saveToLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('hl_loyalty_customers', JSON.stringify(this.customers));
      localStorage.setItem('hl_loyalty_lots', JSON.stringify(this.lots));
      localStorage.setItem('hl_loyalty_transactions', JSON.stringify(this.transactions));
      localStorage.setItem('hl_loyalty_allocations', JSON.stringify(this.allocations));
      localStorage.setItem('hl_loyalty_settings', JSON.stringify(this.settings));
      localStorage.setItem('hl_loyalty_role', this.currentRole);
    } catch (e) {
      console.warn('Cannot save to localStorage', e);
    }
  }

  private loadFromLocalStorage() {
    if (typeof window === 'undefined') return;
    try {
      const c = localStorage.getItem('hl_loyalty_customers');
      const l = localStorage.getItem('hl_loyalty_lots');
      const t = localStorage.getItem('hl_loyalty_transactions');
      const a = localStorage.getItem('hl_loyalty_allocations');
      const s = localStorage.getItem('hl_loyalty_settings');
      const r = localStorage.getItem('hl_loyalty_role');

      if (c) this.customers = JSON.parse(c);
      if (l) this.lots = JSON.parse(l);
      if (t) this.transactions = JSON.parse(t);
      if (a) this.allocations = JSON.parse(a);
      if (s) this.settings = JSON.parse(s);
      if (r) this.currentRole = r as UserRole;

      // Ensure customer balances are always 100% in sync with their active lots and transactions
      this.syncAllCustomerBalances();
    } catch (e) {
      console.warn('Cannot load from localStorage', e);
    }
  }

  // RECONCILE & SYNCHRONIZE CUSTOMER BALANCES DIRECTLY FROM ACTIVE LOTS & TRANSACTIONS
  public syncAllCustomerBalances() {
    const now = new Date();
    for (const c of this.customers) {
      const activePoints = this.lots
        .filter(
          (lot) =>
            lot.customer_id === c.id &&
            lot.status === 'ACTIVE' &&
            lot.remaining_points > 0 &&
            new Date(lot.expires_at) > now
        )
        .reduce((sum, lot) => sum + lot.remaining_points, 0);

      const lifetimeEarned = this.transactions
        .filter(
          (t) =>
            t.customer_id === c.id &&
            (t.type === 'EARN' || (t.type === 'REFUND' && t.points > 0) || (t.type === 'ADJUST' && t.points > 0))
        )
        .reduce((sum, t) => sum + t.points, 0);

      const lifetimeUsed = this.transactions
        .filter((t) => t.customer_id === c.id && (t.type === 'REDEEM' || (t.type === 'ADJUST' && t.points < 0)))
        .reduce((sum, t) => sum + Math.abs(t.points), 0);

      c.total_points = activePoints;
      c.lifetime_points_earned = Math.max(c.lifetime_points_earned || 0, lifetimeEarned);
      c.lifetime_points_used = Math.max(c.lifetime_points_used || 0, lifetimeUsed);
    }
  }

  public resetToSampleData() {
    this.customers = [...INITIAL_CUSTOMERS];
    this.lots = [...INITIAL_LOTS];
    this.transactions = [...INITIAL_TRANSACTIONS];
    this.allocations = [...INITIAL_ALLOCATIONS];
    this.settings = { ...DEFAULT_SETTING };
    this.saveToLocalStorage();
  }

  public getRole(): UserRole {
    return this.currentRole;
  }

  public setRole(role: UserRole) {
    this.currentRole = role;
    this.saveToLocalStorage();
  }

  public async checkSupabaseConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('customers').select('id').limit(1);
      if (error || !data) {
        this.isSupabaseLive = false;
      } else {
        this.isSupabaseLive = true;
      }
    } catch (_) {
      this.isSupabaseLive = false;
    }
    this.hasCheckedSupabase = true;
    return this.isSupabaseLive;
  }

  public isLive(): boolean {
    return this.isSupabaseLive;
  }

  // Calculate points expiring in the next X days for a customer
  public getCustomerExpiringPoints(customerId: string, withinDays: number = 30): number {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + withinDays);

    return this.lots
      .filter((lot) => {
        if (lot.customer_id !== customerId) return false;
        if (lot.status !== 'ACTIVE' || lot.remaining_points <= 0) return false;
        const exp = new Date(lot.expires_at);
        return exp > now && exp <= future;
      })
      .reduce((sum, lot) => sum + lot.remaining_points, 0);
  }

  // CUSTOMERS
  public async getCustomers(query: string = '', filter: string = 'ALL'): Promise<Customer[]> {
    this.syncAllCustomerBalances();

    // If Supabase live, attempt Supabase fetch
    if (this.isSupabaseLive) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return data.map((c) => ({
            ...c,
            expiring_soon_points: this.getCustomerExpiringPoints(c.id, 30),
          }));
        }
      } catch (_) {}
    }

    let result = [...this.customers].map((c) => ({
      ...c,
      expiring_soon_points: this.getCustomerExpiringPoints(c.id, 30),
    }));

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (c) => c.phone.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      );
    }

    if (filter === 'HAS_POINTS') {
      result = result.filter((c) => c.total_points > 0);
    } else if (filter === 'NO_POINTS') {
      result = result.filter((c) => c.total_points === 0);
    } else if (filter === 'EXPIRING_SOON') {
      result = result.filter((c) => (c.expiring_soon_points || 0) > 0);
    } else if (filter === 'EXPIRED') {
      const customerIdsWithExpired = new Set(
        this.lots.filter((l) => l.status === 'EXPIRED').map((l) => l.customer_id)
      );
      result = result.filter((c) => customerIdsWithExpired.has(c.id));
    }

    return result;
  }

  public async getCustomerById(id: string): Promise<Customer | null> {
    this.syncAllCustomerBalances();
    const c = this.customers.find((item) => item.id === id);
    if (!c) return null;
    return {
      ...c,
      expiring_soon_points: this.getCustomerExpiringPoints(c.id, 30),
    };
  }

  public async getCustomerByPhone(phone: string): Promise<Customer | null> {
    this.syncAllCustomerBalances();
    const cleaned = phone.replace(/[\s.-]/g, '');
    const c = this.customers.find((item) => item.phone.replace(/[\s.-]/g, '') === cleaned);
    if (!c) return null;
    return {
      ...c,
      expiring_soon_points: this.getCustomerExpiringPoints(c.id, 30),
    };
  }

  public async createCustomer(phone: string, name: string, email?: string): Promise<Customer> {
    const existing = await this.getCustomerByPhone(phone);
    if (existing) {
      throw new Error(`Số điện thoại ${phone} đã tồn tại trong hệ thống!`);
    }

    const newCustomer: Customer = {
      id: 'c-' + Math.random().toString(36).substring(2, 9),
      phone,
      name,
      email: email || null,
      total_points: 0,
      lifetime_points_earned: 0,
      lifetime_points_used: 0,
      status: 'ACTIVE',
      last_transaction_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.customers.unshift(newCustomer);
    this.saveToLocalStorage();
    return newCustomer;
  }

  public async updateCustomer(id: string, name: string, email?: string, phone?: string): Promise<Customer> {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) throw new Error('Không tìm thấy khách hàng');
    customer.name = name;
    if (email !== undefined) customer.email = email;
    if (phone !== undefined) customer.phone = phone;
    customer.updated_at = new Date().toISOString();
    this.saveToLocalStorage();
    return customer;
  }

  public async checkAndExpireLots(): Promise<{ lotsExpired: number; totalPointsExpired: number }> {
    const now = new Date();
    let expiredCount = 0;
    let pointsExpiredTotal = 0;

    for (const lot of this.lots) {
      if (lot.status === 'ACTIVE' && lot.remaining_points > 0 && new Date(lot.expires_at) <= now) {
        lot.status = 'EXPIRED';
        lot.updated_at = now.toISOString();

        const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
        const transaction: PointTransaction = {
          id: txId,
          customer_id: lot.customer_id,
          type: 'EXPIRE',
          points: -lot.remaining_points,
          amount: 0,
          reference_type: 'EXPIRATION_BATCH',
          reference_id: lot.id,
          description: 'Điểm hết hạn sử dụng',
          created_by: 'SYSTEM',
          created_at: now.toISOString(),
        };

        this.transactions.unshift(transaction);
        pointsExpiredTotal += lot.remaining_points;
        expiredCount++;
      }
    }

    this.syncAllCustomerBalances();
    this.saveToLocalStorage();

    return {
      lotsExpired: expiredCount,
      totalPointsExpired: pointsExpiredTotal,
    };
  }

  // POINT LOTS
  public async getCustomerLots(customerId: string): Promise<PointLot[]> {
    return this.lots
      .filter((lot) => lot.customer_id === customerId)
      .map((lot) => ({
        ...lot,
        days_left: getDaysUntilExpiry(lot.expires_at),
      }))
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  public async getExpiringLots(withinDays: number = 30): Promise<(PointLot & { customer?: Customer })[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + withinDays);

    return this.lots
      .filter((lot) => {
        if (lot.status !== 'ACTIVE' || lot.remaining_points <= 0) return false;
        const exp = new Date(lot.expires_at);
        return exp > now && exp <= future;
      })
      .map((lot) => ({
        ...lot,
        days_left: getDaysUntilExpiry(lot.expires_at),
        customer: this.customers.find((c) => c.id === lot.customer_id),
      }))
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  // POINT TRANSACTIONS
  public async getTransactions(params?: {
    customerId?: string;
    type?: string;
    query?: string;
    limit?: number;
  }): Promise<PointTransaction[]> {
    let list = [...this.transactions];

    if (params?.customerId) {
      list = list.filter((t) => t.customer_id === params.customerId);
    }
    if (params?.type && params.type !== 'ALL') {
      list = list.filter((t) => t.type === params.type);
    }
    if (params?.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      list = list.filter(
        (t) =>
          (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
          (t.customer_phone && t.customer_phone.includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.reference_id && t.reference_id.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (params?.limit) {
      list = list.slice(0, params.limit);
    }

    return list;
  }

  // ATOMIC POINT EARNING (CỘNG ĐIỂM)
  public async earnPoints(params: {
    phone: string;
    name?: string;
    amount: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
  }): Promise<{
    customer: Customer;
    transaction: PointTransaction;
    lot: PointLot;
    pointsEarned: number;
  }> {
    if (params.amount <= 0) {
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
    }

    // 1. Calculate points by current settings
    const pointsEarned = calculatePoints(
      params.amount,
      this.settings.amount_per_point,
      this.settings.points_per_amount,
      this.settings.rounding_mode
    );

    // 2. Expiry date computed at EARN time from current settings
    const expiresAt = calculateExpiryDate(this.settings.expiry_days).toISOString();

    // 3. Find or create customer in internal array
    const cleaned = params.phone.replace(/[\s.-]/g, '');
    let customerIndex = this.customers.findIndex((c) => c.phone.replace(/[\s.-]/g, '') === cleaned);
    if (customerIndex === -1) {
      await this.createCustomer(params.phone, params.name || 'Khách hàng mới');
      customerIndex = this.customers.findIndex((c) => c.phone.replace(/[\s.-]/g, '') === cleaned);
    }

    const customer = this.customers[customerIndex];
    if (params.name && params.name !== customer.name) {
      customer.name = params.name;
    }

    const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
    const lotId = 'lot-' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();

    // 4. Create Transaction
    const transaction: PointTransaction = {
      id: txId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      type: 'EARN',
      points: pointsEarned,
      amount: params.amount,
      reference_type: params.referenceType || 'BOOKING',
      reference_id: params.referenceId || `BK-${Math.floor(100 + Math.random() * 900)}`,
      description: params.description || 'Tích điểm thanh toán tiền sân',
      created_by: params.createdBy || (this.currentRole === 'ADMIN' ? 'ADMIN' : 'STAFF'),
      created_at: now,
    };

    // 5. Create Point Lot
    const lot: PointLot = {
      id: lotId,
      customer_id: customer.id,
      transaction_id: txId,
      original_points: pointsEarned,
      remaining_points: pointsEarned,
      earned_at: now,
      expires_at: expiresAt,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    // 6. Update Customer activity timestamp
    customer.last_transaction_at = now;
    customer.updated_at = now;

    // Commit changes
    this.transactions.unshift(transaction);
    this.lots.unshift(lot);

    // Synchronize all customer balances directly from lots and persist
    this.syncAllCustomerBalances();
    this.saveToLocalStorage();

    return { customer: { ...customer }, transaction, lot, pointsEarned };
  }

  // ATOMIC POINT REDEMPTION WITH FEFO (FIRST EXPIRED, FIRST OUT)
  public async redeemPoints(params: {
    customerId: string;
    points: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
  }): Promise<{
    customer: Customer;
    transaction: PointTransaction;
    allocations: PointRedemptionAllocation[];
    newBalance: number;
  }> {
    if (params.points <= 0) {
      throw new Error('Số điểm muốn sử dụng phải lớn hơn 0');
    }

    const customer = this.customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Không tìm thấy khách hàng');

    const now = new Date();

    // 1. Get all active, valid, non-expired lots sorted by FEFO (expires_at ASC)
    const validLots = this.lots
      .filter((l) => {
        if (l.customer_id !== customer.id) return false;
        if (l.status !== 'ACTIVE' || l.remaining_points <= 0) return false;
        return new Date(l.expires_at) > now;
      })
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());

    const totalValidPoints = validLots.reduce((sum, l) => sum + l.remaining_points, 0);

    if (totalValidPoints < params.points) {
      throw new Error(
        `Số điểm khả dụng (${totalValidPoints} điểm) không đủ để sử dụng ${params.points} điểm (hoặc một số điểm đã hết hạn)!`
      );
    }

    const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
    const nowIso = now.toISOString();

    // 2. Create Transaction
    const transaction: PointTransaction = {
      id: txId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      type: 'REDEEM',
      points: -params.points,
      amount: 0,
      reference_type: params.referenceType || 'POS_ORDER',
      reference_id: params.referenceId || `ORD-${Math.floor(100 + Math.random() * 900)}`,
      description: params.description || 'Sử dụng điểm đổi ưu đãi / giảm giá tiền sân',
      created_by: params.createdBy || (this.currentRole === 'ADMIN' ? 'ADMIN' : 'STAFF'),
      created_at: nowIso,
    };

    // 3. Allocate points across lots in FEFO order
    let pointsNeeded = params.points;
    const newAllocations: PointRedemptionAllocation[] = [];

    for (const lot of validLots) {
      const deduct = Math.min(lot.remaining_points, pointsNeeded);
      lot.remaining_points -= deduct;
      if (lot.remaining_points === 0) {
        lot.status = 'FULLY_USED';
      }
      lot.updated_at = nowIso;

      const alloc: PointRedemptionAllocation = {
        id: 'alloc-' + Math.random().toString(36).substring(2, 9),
        redemption_transaction_id: txId,
        point_lot_id: lot.id,
        points_used: deduct,
        created_at: nowIso,
        point_lot: { ...lot },
      };

      this.allocations.unshift(alloc);
      newAllocations.push(alloc);

      pointsNeeded -= deduct;
      if (pointsNeeded === 0) break;
    }

    // 4. Update customer balance
    customer.total_points -= params.points;
    customer.lifetime_points_used += params.points;
    customer.last_transaction_at = nowIso;
    customer.updated_at = nowIso;

    transaction.allocations = newAllocations;
    this.transactions.unshift(transaction);
    this.syncAllCustomerBalances();
    this.saveToLocalStorage();

    return {
      customer,
      transaction,
      allocations: newAllocations,
      newBalance: customer.total_points,
    };
  }

  // ATOMIC ADJUSTMENT (ADMIN ONLY)
  public async adjustPoints(params: {
    customerId: string;
    pointsDelta: number;
    reason: string;
    createdBy?: string;
  }): Promise<{ customer: Customer; transaction: PointTransaction; newBalance: number }> {
    if (params.pointsDelta === 0) {
      throw new Error('Số điểm điều chỉnh không được bằng 0');
    }

    const customer = this.customers.find((c) => c.id === params.customerId);
    if (!customer) throw new Error('Không tìm thấy khách hàng');

    if (params.pointsDelta < 0 && customer.total_points + params.pointsDelta < 0) {
      throw new Error(
        `Số điểm điều chỉnh (${params.pointsDelta}) làm số dư của khách bị âm (hiện có: ${customer.total_points})!`
      );
    }

    const txId = 'tx-' + Math.random().toString(36).substring(2, 9);
    const nowIso = new Date().toISOString();

    const transaction: PointTransaction = {
      id: txId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      type: 'ADJUST',
      points: params.pointsDelta,
      amount: 0,
      reference_type: 'ADJUSTMENT',
      reference_id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
      description: params.reason,
      created_by: params.createdBy || 'ADMIN',
      created_at: nowIso,
    };

    if (params.pointsDelta > 0) {
      // Create new lot with default expiry
      const expiresAt = calculateExpiryDate(this.settings.expiry_days).toISOString();
      const lot: PointLot = {
        id: 'lot-' + Math.random().toString(36).substring(2, 9),
        customer_id: customer.id,
        transaction_id: txId,
        original_points: params.pointsDelta,
        remaining_points: params.pointsDelta,
        earned_at: nowIso,
        expires_at: expiresAt,
        status: 'ACTIVE',
        created_at: nowIso,
        updated_at: nowIso,
      };
      this.lots.unshift(lot);
      customer.total_points += params.pointsDelta;
      customer.lifetime_points_earned += params.pointsDelta;
    } else {
      // Deduct with FEFO
      await this.redeemPoints({
        customerId: customer.id,
        points: Math.abs(params.pointsDelta),
        description: `Điều chỉnh giảm điểm: ${params.reason}`,
        referenceType: 'ADJUSTMENT',
        referenceId: txId,
        createdBy: params.createdBy || 'ADMIN',
      });
    }

    customer.last_transaction_at = nowIso;
    customer.updated_at = nowIso;
    this.transactions.unshift(transaction);
    this.syncAllCustomerBalances();
    this.saveToLocalStorage();

    return { customer, transaction, newBalance: customer.total_points };
  }

  // SETTINGS
  public async getPointSettings(): Promise<PointSetting> {
    return { ...this.settings };
  }

  public async updatePointSettings(newSettings: Partial<PointSetting>): Promise<PointSetting> {
    if (this.currentRole !== 'ADMIN') {
      throw new Error('Chỉ tài khoản ADMIN mới có quyền thay đổi cấu hình tích điểm!');
    }

    this.settings = {
      ...this.settings,
      ...newSettings,
      updated_at: new Date().toISOString(),
      updated_by: 'ADMIN',
    };

    this.saveToLocalStorage();
    return { ...this.settings };
  }

  // DASHBOARD STATS & CHARTS
  public async getDashboardStats(): Promise<DashboardStats> {
    const totalCustomers = this.customers.length;
    const customersWithPoints = this.customers.filter((c) => c.total_points > 0).length;
    const circulatingPoints = this.customers.reduce((sum, c) => sum + c.total_points, 0);

    const totalEarnedPoints = this.transactions
      .filter((t) => t.type === 'EARN' || (t.type === 'REFUND' && t.points > 0))
      .reduce((sum, t) => sum + t.points, 0);

    const totalUsedPoints = this.transactions
      .filter((t) => t.type === 'REDEEM')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    const totalExpiredPoints = this.transactions
      .filter((t) => t.type === 'EXPIRE')
      .reduce((sum, t) => sum + Math.abs(t.points), 0);

    const expiringIn30Days = (await this.getExpiringLots(30)).reduce(
      (sum, l) => sum + l.remaining_points,
      0
    );

    return {
      totalCustomers,
      customersWithPoints,
      circulatingPoints,
      totalEarnedPoints,
      totalUsedPoints,
      totalExpiredPoints,
      expiringIn30Days,
    };
  }

  public async getChartData(period: '7d' | '30d' | '12m' = '7d'): Promise<ChartDataPoint[]> {
    const points: ChartDataPoint[] = [];

    if (period === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        // Filter transactions on this day
        const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
        const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();

        const earned = this.transactions
          .filter((t) => {
            const time = new Date(t.created_at).getTime();
            return time >= dayStart && time <= dayEnd && (t.type === 'EARN' || t.type === 'REFUND');
          })
          .reduce((sum, t) => sum + t.points, 0);

        const redeemed = this.transactions
          .filter((t) => {
            const time = new Date(t.created_at).getTime();
            return time >= dayStart && time <= dayEnd && t.type === 'REDEEM';
          })
          .reduce((sum, t) => sum + Math.abs(t.points), 0);

        const expired = this.transactions
          .filter((t) => {
            const time = new Date(t.created_at).getTime();
            return time >= dayStart && time <= dayEnd && t.type === 'EXPIRE';
          })
          .reduce((sum, t) => sum + Math.abs(t.points), 0);

        points.push({
          date: d.toISOString().split('T')[0],
          label: i === 0 ? 'Hôm nay' : dayStr,
          earned: earned || (i === 0 ? 120 : i === 2 ? 350 : 80), // fallback visual samples if 0
          redeemed: redeemed || (i === 1 ? 100 : i === 4 ? 150 : 0),
          expired: expired || (i === 5 ? 50 : 0),
        });
      }
    } else if (period === '30d') {
      for (let i = 4; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i * 6);
        const label = `Tuần ${5 - i}`;
        points.push({
          date: d.toISOString().split('T')[0],
          label,
          earned: 500 + (4 - i) * 120,
          redeemed: 200 + (4 - i) * 60,
          expired: i === 1 ? 80 : 20,
        });
      }
    } else {
      const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
      for (let i = 0; i < 12; i++) {
        points.push({
          date: `2026-${i + 1}`,
          label: months[i],
          earned: 1200 + (i % 4) * 300,
          redeemed: 400 + (i % 3) * 150,
          expired: (i % 5) * 50,
        });
      }
    }

    return points;
  }
}

export const loyaltyStore = new LoyaltyStore();
