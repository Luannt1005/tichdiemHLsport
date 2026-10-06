/**
 * Client gọi các Route Handler nội bộ (/api/...). Component KHÔNG truy cập Supabase trực tiếp.
 * Cookie phiên (httpOnly) được trình duyệt tự gửi kèm.
 */
import {
  ActivityLog,
  ActivityLogFilter,
  AdjustPointsInput,
  AdjustPointsResult,
  AppUser,
  ChartDataPoint,
  ChartPeriod,
  CreateUserInput,
  Customer,
  CustomerDetail,
  CustomerFilter,
  DashboardStats,
  EarnPointsInput,
  EarnPointsResult,
  ExpireCheckResult,
  ExpiringLot,
  PaginatedCustomers,
  PaginatedTransactions,
  PointSetting,
  PointSettingUpdate,
  PointTransaction,
  RedeemPointsInput,
  RedeemPointsResult,
  UserListResult,
  UserRole,
} from '@/types/database';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** authStore đăng ký để tự xóa phiên phía client khi server trả 401 */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    if (res.status === 401 && endpoint !== '/auth/login') unauthorizedHandler?.();
    throw new ApiError(errData.error || errData.message || `Lỗi HTTP ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') q.append(key, String(value));
  }
  const str = q.toString();
  return str ? `?${str}` : '';
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const loyaltyApi = {
  // Dashboard
  getStats: () => fetchApi<DashboardStats>('/dashboard/stats'),
  getChartData: (period: ChartPeriod = '7d') => fetchApi<ChartDataPoint[]>(`/dashboard/chart${query({ period })}`),
  getExpiring: (days = 30) => fetchApi<ExpiringLot[]>(`/dashboard/expiring${query({ days })}`),

  // Customers
  getCustomers: (search?: string, filter: CustomerFilter = 'ALL', page = 1, pageSize = 20) =>
    fetchApi<PaginatedCustomers>(`/customers${query({ search, filter, page, pageSize })}`),
  getCustomer: (id: string) => fetchApi<CustomerDetail>(`/customers/${encodeURIComponent(id)}`),
  getCustomerByPhone: async (phone: string) =>
    (await fetchApi<{ customer: Customer | null }>(`/customers/by-phone${query({ phone })}`)).customer,
  createCustomer: (data: { phone: string; name: string; email?: string }) =>
    fetchApi<Customer>('/customers', json('POST', data)),
  updateCustomer: (id: string, data: { name?: string; email?: string | null; phone?: string }) =>
    fetchApi<Customer>(`/customers/${encodeURIComponent(id)}`, json('PUT', data)),
  deleteCustomer: (id: string) =>
    fetchApi<{ success: true; message: string }>(`/customers/${encodeURIComponent(id)}`, json('DELETE')),

  // Settings
  getSettings: () => fetchApi<PointSetting>('/settings'),
  updateSettings: (data: PointSettingUpdate) => fetchApi<PointSetting>('/settings', json('PUT', data)),

  // Points
  earnPoints: (data: EarnPointsInput) => fetchApi<EarnPointsResult>('/points/earn', json('POST', data)),
  redeemPoints: (data: RedeemPointsInput) => fetchApi<RedeemPointsResult>('/points/redeem', json('POST', data)),
  adjustPoints: (data: AdjustPointsInput) => fetchApi<AdjustPointsResult>('/points/adjust', json('POST', data)),
  expireCheck: () => fetchApi<ExpireCheckResult>('/points/expire-check', json('POST')),

  // Transactions
  getTransactions: (params: { type?: string; customerId?: string; query?: string; limit?: number } = {}) =>
    fetchApi<PointTransaction[]>(`/transactions${query(params)}`),
  getTransactionsPaginated: (params: { type?: string; customerId?: string; query?: string; page?: number; pageSize?: number } = {}) =>
    fetchApi<PaginatedTransactions>(`/transactions${query(params)}`),

  // Activity logs
  getActivityLogs: (filters: ActivityLogFilter = {}) =>
    fetchApi<{ logs: ActivityLog[]; total: number }>(
      `/logs${query({ ...filters })}`
    ),

  // Auth
  login: (username: string, password: string) =>
    fetchApi<{ user: AppUser }>('/auth/login', json('POST', { username, password })),
  logout: () => fetchApi<{ success: true }>('/auth/logout', json('POST')),
  me: () => fetchApi<{ user: AppUser }>('/auth/me'),
  register: (data: CreateUserInput) =>
    fetchApi<{ user: AppUser; pendingApproval: boolean }>('/auth/register', json('POST', data)),
  changePassword: (oldPassword: string, newPassword: string) =>
    fetchApi<{ success: true }>('/auth/password', json('POST', { oldPassword, newPassword })),

  // Users (ADMIN)
  getUsers: () => fetchApi<UserListResult>('/users'),
  createUser: (data: CreateUserInput) => fetchApi<{ user: AppUser }>('/users', json('POST', data)),
  updateUserRole: (id: string, role: UserRole) =>
    fetchApi<{ user: AppUser }>(`/users/${encodeURIComponent(id)}`, json('PATCH', { role })),
  setUserActive: (id: string, isActive: boolean) =>
    fetchApi<{ user: AppUser }>(`/users/${encodeURIComponent(id)}`, json('PATCH', { is_active: isActive })),
  resetUserPassword: (id: string, password: string) =>
    fetchApi<{ user: AppUser }>(`/users/${encodeURIComponent(id)}`, json('PATCH', { password })),
  deleteUser: (id: string) => fetchApi<{ success: true }>(`/users/${encodeURIComponent(id)}`, json('DELETE')),
};
