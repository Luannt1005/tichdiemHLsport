/**
 * Next.js App Router Internal API Client
 * Calls standard internal Next.js Route Handlers (/api/...)
 */

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
    throw new Error(errData.error || errData.message || `HTTP error ${res.status}`);
  }

  return await res.json();
}

export const loyaltyApi = {
  // Dashboard
  getStats: () => fetchApi<any>('/dashboard/stats'),
  getChartData: (period = '7d') => fetchApi<any[]>(`/dashboard/chart?period=${period}`),
  getExpiring: (days = 30) => fetchApi<any[]>(`/dashboard/expiring?days=${days}`),

  // Customers
  getCustomers: (search?: string) =>
    fetchApi<any[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id: string) => fetchApi<any>(`/customers/${id}`),
  createCustomer: (data: { phone: string; name: string; email?: string }) =>
    fetchApi<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomer: (id: string, data: { name?: string; email?: string }) =>
    fetchApi<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Settings
  getSettings: () => fetchApi<any>('/settings'),
  updateSettings: (data: any) =>
    fetchApi<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Points Operations
  earnPoints: (data: {
    phone: string;
    amount: number;
    name?: string;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
  }) =>
    fetchApi<any>('/points/earn', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  redeemPoints: (data: {
    customerId: string;
    points: number;
    description?: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
  }) =>
    fetchApi<any>('/points/redeem', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adjustPoints: (data: { customerId: string; pointsDelta: number; reason: string; createdBy?: string }) =>
    fetchApi<any>('/points/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  expireCheck: () =>
    fetchApi<any>('/points/expire-check', {
      method: 'POST',
    }),

  // Transactions
  getTransactions: (params?: { type?: string; customerId?: string; query?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append('type', params.type);
    if (params?.customerId) q.append('customerId', params.customerId);
    if (params?.query) q.append('query', params.query);
    if (params?.limit) q.append('limit', String(params.limit));
    return fetchApi<any[]>(`/transactions?${q.toString()}`);
  },
};
