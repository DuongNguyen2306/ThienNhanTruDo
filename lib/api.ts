// API Client for Thiên Nhãn Backend

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://thiennhantrudo-be.onrender.com'

// Helper to get full URL for backend-served files (uploads, etc.)
export function getBackendUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_BASE}${path}`
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
}

class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.status = status
    this.data = data
  }
}

async function api<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      throw new ApiError(
        (data as { error?: string })?.error ?? 'Lỗi server',
        res.status,
        data
      )
    }

    return data as T
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError('Yêu cầu hết thời gian. Vui lòng thử lại.', 408)
    }
    throw err
  }
}

// Export the base api function for custom calls
export { api }

// Auth API
export const authApi = {
  login: (phone: string, password: string) =>
    api<{ user: SessionUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { phone, password },
    }),

  register: (data: RegisterData) =>
    api<{ user: SessionUser; token: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
    }),

  getMe: () =>
    api<{ user: SessionUser }>('/api/auth/me'),

  updateProfile: (data: Partial<ProfileData>) =>
    api<{ user: SessionUser }>('/api/auth/profile', {
      method: 'PUT',
      body: data,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ message: string }>('/api/auth/password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }),

  logout: () =>
    api<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  // Seller application
  applySeller: (data: { idNumber: string; permanentAddress: string }) =>
    api<{ message: string; status: string; sellerProfile?: any }>('/api/auth/apply-seller', {
      method: 'POST',
      body: data,
    }),

  getSellerApplication: () =>
    api<{
      hasApplied: boolean;
      status: string | null;
      canApply: boolean;
      sellerProfile?: any;
    }>('/api/auth/seller-application'),
}

// Listing API
export const listingApi = {
  search: (params?: ListingSearchParams) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // Handle boolean values properly
          if (typeof value === 'boolean') {
            if (value) searchParams.append(key, 'true')
          } else {
            searchParams.append(key, String(value))
          }
        }
      })
    }
    const query = searchParams.toString()
    return api<{ listings: Listing[]; pagination: Pagination }>(
      `/api/listings${query ? `?${query}` : ''}`
    )
  },

  getFeatured: () =>
    api<{ listings: Listing[] }>('/api/listings/featured'),

  getById: (id: string) =>
    api<{ listing: Listing }>(`/api/listings/${id}`),
}

// Seller API
export const sellerApi = {
  getDashboard: () =>
    api<{ stats: SellerDashboardStats }>('/api/seller/dashboard'),

  getListings: (status?: string) =>
    api<{ listings: Listing[] }>(
      `/api/seller/listings${status ? `?status=${status}` : ''}`
    ),

  getListing: (id: string) =>
    api<{ listing: Listing }>(`/api/seller/listings/${id}`),

  createListing: (data: CreateListingData) =>
    api<{ listing: Listing }>('/api/seller/listings', {
      method: 'POST',
      body: data,
    }),

  updateListing: (id: string, data: Partial<CreateListingData>) =>
    api<{ listing: Listing }>(`/api/seller/listings/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteListing: (id: string) =>
    api<{ message: string }>(`/api/seller/listings/${id}`, {
      method: 'DELETE',
    }),

  getProfile: () =>
    api<{ profile: SellerProfile }>('/api/seller/profile'),

  updateProfile: (data: Partial<SellerProfileData>) =>
    api<{ profile: SellerProfile }>('/api/seller/profile', {
      method: 'PUT',
      body: data,
    }),

  getLeads: () =>
    api<{ leads: SellerLead[] }>('/api/seller/leads'),

  updateLead: (id: string, status: string) =>
    api<{ lead: SellerLead }>(`/api/seller/leads/${id}`, {
      method: 'PUT',
      body: { status },
    }),

  getAppointments: (status?: string) =>
    api<{ appointments: Appointment[] }>(
      `/api/seller/appointments${status ? `?status=${status}` : ''}`
    ),

  updateAppointment: (id: string, status: string) =>
    api<{ appointment: Appointment }>(`/api/seller/appointments/${id}`, {
      method: 'PUT',
      body: { status },
    }),

  // Upload photos for a listing
  uploadPhotos: (files: File[], listingId?: string) => {
    const formData = new FormData()
    files.forEach(file => formData.append('photos', file))
    if (listingId) formData.append('listingId', listingId)
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    
    return fetch(`${API_BASE}/api/seller/upload`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw new ApiError(data.error || 'Upload thất bại', res.status, data)
      return data as { success: boolean; files: UploadedFile[]; message: string }
    })
  },

  // Delete a photo
  deletePhoto: (filename: string, listingId?: string) => {
    const params = listingId ? `?listingId=${listingId}` : ''
    return api<{ success: boolean; message: string }>(
      `/api/seller/upload/${filename}${params}`,
      { method: 'DELETE' }
    )
  },

  // Update listing photos array
  updatePhotos: (listingId: string, photos: string[]) =>
    api<{ success: boolean; photos: string[] }>(`/api/seller/listings/${listingId}/photos`, {
      method: 'PUT',
      body: { photos },
    }),

  // Reservation APIs
  getReservations: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return api<{ reservations: SellerReservation[]; pagination: Pagination }>(
      `/api/seller/reservations${query ? `?${query}` : ''}`
    )
  },

  getReservation: (id: string) =>
    api<{ reservation: SellerReservationDetail }>(`/api/seller/reservations/${id}`),

  approveReservation: (id: string) =>
    api<{ message: string; reservation: Reservation }>(`/api/seller/reservations/${id}/approve`, {
      method: 'PATCH',
    }),

  rejectReservation: (id: string, reason?: string) =>
    api<{ message: string; reservation: Reservation }>(`/api/seller/reservations/${id}/reject`, {
      method: 'PATCH',
      body: { reason },
    }),

  // Contract APIs
  getContracts: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return api<{ contracts: SellerContract[]; pagination: Pagination }>(
      `/api/seller/contracts${query ? `?${query}` : ''}`
    )
  },

  getContract: (id: string) =>
    api<{ contract: SellerContractDetail }>(`/api/seller/contracts/${id}`),

  uploadContract: (formData: FormData) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    // Don't set Content-Type for FormData - browser will set it with boundary
    return fetch(`${API_BASE}/api/seller/contracts`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw new ApiError(data.error || 'Upload thất bại', res.status, data)
      return data as { message: string; contract: Contract }
    })
  },

  archiveContract: (id: string) =>
    api<{ message: string; contract: Contract }>(`/api/seller/contracts/${id}/archive`, {
      method: 'PATCH',
    }),

  revokeContract: (id: string) =>
    api<{ message: string; contract: Contract }>(`/api/seller/contracts/${id}/revoke`, {
      method: 'PATCH',
    }),

  // Boost APIs
  getBoostPackages: () =>
    api<{ packages: BoostPackage[] }>('/api/seller/boost/packages'),

  getBoostHistory: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const query = searchParams.toString()
    return api<{ boosts: BoostRecord[]; pagination: Pagination }>(
      `/api/seller/boost/history${query ? `?${query}` : ''}`
    )
  },

  getActiveBoosts: () =>
    api<{ boosts: ActiveBoost[] }>('/api/seller/boost/active'),

  purchaseBoost: (listingId: string, packageId: string, requestId?: string) =>
    api<{ success: boolean; message: string; idempotent?: boolean; originalTransactionId?: string; wallet: { id: string; balance: number }; listing: { id: string; vip: boolean; vipExpiresAt: string } }>(
      '/api/seller/boost/purchase',
      { method: 'POST', body: { listingId, packageId, requestId } }
    ),

  // Boost bank transfer order APIs
  createBoostOrder: (listingId: string, packageId: string) =>
    api<{ success: boolean; order: BoostOrder }>(
      '/api/seller/boost/create-order',
      { method: 'POST', body: { listingId, packageId } }
    ),

  getBoostOrders: (params?: { status?: string }) => {
    const query = params?.status ? `?status=${params.status}` : ''
    return api<{ orders: BoostOrder[] }>(`/api/seller/boost/orders${query}`)
  },

  getBoostOrder: (id: string) =>
    api<{ order: BoostOrder }>(`/api/seller/boost/order/${id}`),

  getBoostVietQR: (orderId: string) =>
    api<{ success: boolean; qrUrl: string; bankInfo: any; transferInfo: any }>(
      `/api/seller/boost/vietqr/${orderId}`
    ),

  submitBoostProof: (orderId: string, proofBase64: string, proofMimeType?: string) =>
    api<{ success: boolean; order: Partial<BoostOrder> }>(
      '/api/seller/boost/submit-proof',
      { method: 'POST', body: { orderId, proofBase64, proofMimeType: proofMimeType || 'image/jpeg' } }
    ),

  cancelBoostOrder: (id: string) =>
    api<{ success: boolean; order: BoostOrder }>(
      `/api/seller/boost/cancel-order/${id}`,
      { method: 'POST' }
    ),

  getBoostBankAccount: () =>
    api<{ bankAccount: BankAccount }>('/api/seller/boost/bank-account'),
}

// Boost types
export interface BoostPackage {
  id: string
  name: string
  days: number
  price: number
  description: string
}

export interface BoostRecord {
  listingId: string
  listingTitle: string
  startedAt: string
  expiresAt: string
  status: string
}

export interface ActiveBoost {
  id: string
  title: string
  image?: string
  vip: boolean
  vipExpiresAt: string
}

export interface BoostOrder {
  id: string
  orderRef: string
  userId: string
  listingId: string
  listingTitle: string
  packageId: string
  packageName: string
  packagePrice: number
  packageDays: number
  bankName: string
  bankBin: string
  accountNumber: string
  accountHolder: string
  transferRef: string
  amount: number
  status: 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
  proofUrl?: string
  proofUploadedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  reviewerNote?: string
  verifiedBankTx?: string
  verifiedDate?: string
  expiresAt: string
  createdAt: string
}

export interface BankAccount {
  bankName: string
  bankBin: string
  accountNumber: string
  accountHolder: string
  qrImageUrl?: string
}

// Manager API
export const managerApi = {
  getApprovals: (status = 'pending', page = 1) =>
    api<{ listings: Listing[]; pagination: Pagination }>(
      `/api/manager/approvals?status=${status}&page=${page}`
    ),

  getApprovalDetail: (id: string) =>
    api<{ listing: Listing }>(`/api/manager/approvals/${id}`),

  approveListing: (id: string, badges?: ListingBadges) =>
    api<{ listing: Listing }>(`/api/manager/approvals/${id}/approve`, {
      method: 'PUT',
      body: badges ?? {},
    }),

  rejectListing: (id: string, reason: string) =>
    api<{ listing: Listing }>(`/api/manager/approvals/${id}/reject`, {
      method: 'PUT',
      body: { reason },
    }),

  getSellerRequests: (status = 'pending') =>
    api<{ requests: SellerRequest[] }>(
      `/api/manager/seller-requests?status=${status}`
    ),

  getSellerRequestDetail: (id: string) =>
    api<{ request: SellerRequest }>(`/api/manager/seller-requests/${id}`),

  approveSeller: (id: string) =>
    api<{ message: string }>(`/api/manager/seller-requests/${id}/approve`, {
      method: 'PUT',
    }),

  rejectSeller: (id: string, note?: string) =>
    api<{ profile: SellerProfile }>(`/api/manager/seller-requests/${id}/reject`, {
      method: 'PUT',
      body: { note },
    }),

  getReports: (status = 'pending') =>
    api<{ reports: Report[] }>(`/api/manager/reports?status=${status}`),

  getReportDetail: (id: string) =>
    api<{ report: Report }>(`/api/manager/reports/${id}`),

  resolveReport: (id: string, resolution?: string, action?: string) =>
    api<{ report: Report }>(`/api/manager/reports/${id}/resolve`, {
      method: 'PUT',
      body: { resolution, action },
    }),

  getStats: () =>
    api<ManagerStats>('/api/manager/stats'),

  getAudit: (page = 1) =>
    api<{ logs: AuditLog[]; pagination: Pagination }>(
      `/api/manager/audit?page=${page}`
    ),

  // Account management
  getAccounts: (params?: {
    search?: string
    role?: string
    status?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)
    if (params?.role) searchParams.append('role', params.role)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    const query = searchParams.toString()
    return api<{ accounts: any[]; pagination: Pagination }>(
      `/api/manager/accounts${query ? `?${query}` : ''}`
    )
  },

  getAccountStats: () =>
    api<{ total: number; tenants: number; sellers: number; pendingReviews: number }>(
      '/api/manager/accounts/stats'
    ),

  getAccountDetail: (id: string) =>
    api<any>(`/api/manager/accounts/${id}`),

  // Account Moderation Proposals
  getProposals: (params?: {
    search?: string
    status?: string
    type?: string
    priority?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    const query = searchParams.toString()
    return api<{ proposals: any[]; pagination: Pagination }>(
      `/api/manager/account-proposals${query ? `?${query}` : ''}`
    )
  },

  getProposalStats: () =>
    api<{ total: number; draft: number; pending: number; approved: number; rejected: number }>(
      '/api/manager/account-proposals/stats'
    ),

  getProposalDetail: (id: string) =>
    api<any>(`/api/manager/account-proposals/${id}`),

  createProposal: (data: {
    targetUserId: string
    type: string
    reason: string
    description?: string
    priority?: string
    evidence?: string[]
  }) =>
    api<{ proposal: any }>('/api/manager/account-proposals', {
      method: 'POST',
      body: data,
    }),

  updateProposal: (id: string, data: {
    type?: string
    reason?: string
    description?: string
    priority?: string
    evidence?: string[]
  }) =>
    api<{ proposal: any }>(`/api/manager/account-proposals/${id}`, {
      method: 'PUT',
      body: data,
    }),

  submitProposal: (id: string) =>
    api<{ proposal: any }>(`/api/manager/account-proposals/${id}/submit`, {
      method: 'POST',
    }),

  // Get users for dropdown (managers can search accounts)
  getAccountsForProposal: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const query = searchParams.toString()
    return api<{ accounts: any[]; pagination: Pagination }>(
      `/api/manager/accounts${query ? `?${query}` : ''}`
    )
  },
}

// Admin API
export const adminApi = {
  getDashboard: () =>
    api<{ stats: AdminDashboardStats }>('/api/admin/dashboard'),

  // Account Moderation Proposals (Admin)
  getProposals: (params?: {
    search?: string
    status?: string
    type?: string
    priority?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.type) searchParams.append('type', params.type)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
    const query = searchParams.toString()
    return api<{ proposals: any[]; pagination: Pagination }>(
      `/api/admin/account-proposals${query ? `?${query}` : ''}`
    )
  },

  getProposalStats: () =>
    api<{ total: number; draft: number; pending: number; approved: number; rejected: number }>(
      '/api/admin/account-proposals/stats'
    ),

  getProposalDetail: (id: string) =>
    api<any>(`/api/admin/account-proposals/${id}`),

  reviewProposal: (id: string, action: 'approve' | 'reject', reviewNote?: string) =>
    api<{ proposal: any }>(`/api/admin/account-proposals/${id}/review`, {
      method: 'POST',
      body: { action, reviewNote },
    }),

  getUsers: (params?: { role?: string; search?: string; page?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.role) searchParams.append('role', params.role)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', String(params.page))
    const query = searchParams.toString()
    return api<{ users: User[]; pagination: Pagination }>(
      `/api/admin/users${query ? `?${query}` : ''}`
    )
  },

  getUserDetail: (id: string) =>
    api<{ user: User }>(`/api/admin/users/${id}`),

  changeUserRole: (id: string, role: string) =>
    api<{ user: User }>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: { role },
    }),

  deleteUser: (id: string) =>
    api<{ message: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    }),

  getListings: (params?: { status?: string; search?: string; page?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.page) searchParams.append('page', String(params.page))
    const query = searchParams.toString()
    return api<{ listings: Listing[]; pagination: Pagination }>(
      `/api/admin/listings${query ? `?${query}` : ''}`
    )
  },

  getListingById: (id: string) =>
    api<{ listing: Listing }>(`/api/admin/listings/${id}`),

  updateListingStatus: (id: string, status: string) =>
    api<{ listing: Listing }>(`/api/admin/listings/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),

  deleteListing: (id: string) =>
    api<{ message: string }>(`/api/admin/listings/${id}`, {
      method: 'DELETE',
    }),

  getTransactions: (params?: { type?: string; status?: string; page?: number; limit?: number; search?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.append('type', params.type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.search) searchParams.append('search', params.search)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return api<{ transactions: Transaction[]; pagination: Pagination }>(
      `/api/admin/transactions${query ? `?${query}` : ''}`
    )
  },

  getFinanceOverview: () =>
    api<{
      totalRevenue: number
      periodRevenue: number
      completedCount: number
      totalRefunded: number
      netRevenue: number
      pendingCount: number
      transactionCount: number
    }>('/api/admin/finance/overview'),

  getFinanceChart: (params?: { period: 'day' | 'week' | 'month' | 'quarter' | 'year'; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.period) searchParams.append('period', params.period)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return api<Array<{ label: string; revenue: number; count: number; refunds: number }>>(
      `/api/admin/finance/chart${query ? `?${query}` : ''}`
    )
  },

  getFinanceSources: () =>
    api<Array<{ type: string; total: number; count: number; percentage: number }>>(
      '/api/admin/finance/sources'
    ),

  getConfig: () =>
    api<{ config: Record<string, unknown> }>('/api/admin/config'),

  updateConfig: (key: string, value: unknown, description?: string) =>
    api<{ config: SystemConfig }>('/api/admin/config', {
      method: 'PUT',
      body: { key, value, description },
    }),

  getAudit: (params?: {
    actorId?: string
    action?: string
    targetType?: string
    page?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.actorId) searchParams.append('actorId', params.actorId)
    if (params?.action) searchParams.append('action', params.action)
    if (params?.targetType) searchParams.append('targetType', params.targetType)
    if (params?.page) searchParams.append('page', String(params.page))
    const query = searchParams.toString()
    return api<{ logs: AuditLog[]; pagination: Pagination }>(
      `/api/admin/audit${query ? `?${query}` : ''}`
    )
  },
}

// Tenant API
export const tenantApi = {
  getProfile: () =>
    api<{ user: User; stats: TenantStats }>('/api/tenant/profile'),

  getSaved: () =>
    api<{ listings: Listing[] }>('/api/tenant/saved'),

  saveListing: (listingId: string) =>
    api<{ message: string }>(`/api/tenant/saved/${listingId}`, {
      method: 'POST',
    }),

  unsaveListing: (listingId: string) =>
    api<{ message: string }>(`/api/tenant/saved/${listingId}`, {
      method: 'DELETE',
    }),

  createAppointment: (data: {
    listingId: string
    when: string
    phone?: string
    note?: string
  }) =>
    api<{ appointment: Appointment }>('/api/tenant/appointments', {
      method: 'POST',
      body: data,
    }),

  getAppointments: (status?: string) =>
    api<{ appointments: Appointment[] }>(
      `/api/tenant/appointments${status ? `?status=${status}` : ''}`
    ),

  cancelAppointment: (id: string) =>
    api<{ message: string }>(`/api/tenant/appointments/${id}`, {
      method: 'DELETE',
    }),

  sendLead: (data: {
    listingId?: string
    name: string
    phone: string
    message?: string
    when?: string
  }) =>
    api<{ lead: SellerLead }>('/api/tenant/leads', {
      method: 'POST',
      body: data,
    }),

  createReview: (data: CreateReviewData) =>
    api<{ review: Review }>('/api/tenant/reviews', {
      method: 'POST',
      body: data,
    }),

  getReviews: () =>
    api<{ reviews: TenantReview[] }>('/api/tenant/reviews'),

  getReviewEligibility: (listingId: string) =>
    api<{
      eligible: boolean
      reason: string
      hasCompletedAppointment: boolean
      hasActiveReservation: boolean
      hasExistingReview: boolean
      existingReviewId: string | null
    }>(`/api/tenant/reviews/eligibility/${listingId}`),

  getListingReviews: (listingId: string) =>
    api<{
      reviews: any[]
      stats: {
        totalReviews: number
        avgRating: number
        starDistribution: Record<number, number>
      }
    }>(`/api/tenant/reviews/listing/${listingId}`),

  updateReview: (id: string, data: Partial<CreateReviewData>) =>
    api<{ review: Review }>(`/api/tenant/reviews/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  createReport: (data: {
    listingId?: string
    severity: string
    title: string
    reason: string
    tone?: string
  }) =>
    api<{ report: Report }>('/api/tenant/reports', {
      method: 'POST',
      body: data,
    }),

  // Seller upgrade request
  requestUpgrade: (data: {
    idNumber: string
    brand?: string
    address?: string
    docs?: string[]
  }) =>
    api<{ message: string; profile?: SellerProfile }>('/api/tenant/upgrade', {
      method: 'POST',
      body: data,
    }),

  getUpgradeStatus: () =>
    api<{ status: string; role: string; message: string; submittedAt?: string; reviewedAt?: string; reviewNote?: string }>('/api/tenant/upgrade'),

  // Reservation APIs
  createReservation: (listingId: string, note?: string) =>
    api<{ message: string; reservation: Reservation }>('/api/tenant/reservations', {
      method: 'POST',
      body: { listingId, note },
    }),

  getReservations: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const query = searchParams.toString()
    return api<{ reservations: Reservation[]; pagination: Pagination }>(
      `/api/tenant/reservations${query ? `?${query}` : ''}`
    )
  },

  getReservation: (id: string) =>
    api<{ reservation: Reservation }>(`/api/tenant/reservations/${id}`),

  cancelReservation: (id: string, reason?: string) =>
    api<{ message: string; reservation: Reservation }>(`/api/tenant/reservations/${id}/cancel`, {
      method: 'PATCH',
      body: { reason },
    }),

  // Contract APIs
  getContracts: (params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    const query = searchParams.toString()
    return api<{ contracts: Contract[]; pagination: Pagination }>(
      `/api/tenant/contracts${query ? `?${query}` : ''}`
    )
  },

  getContract: (id: string) =>
    api<{ contract: Contract }>(`/api/tenant/contracts/${id}`),
}

// Notification API
export const notificationApi = {
  getAll: (params?: { page?: number; limit?: number; type?: string; unreadOnly?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.type) searchParams.append('type', params.type)
    if (params?.unreadOnly) searchParams.append('unreadOnly', 'true')
    const query = searchParams.toString()
    return api<{ notifications: Notification[]; unreadCount: number; pagination: Pagination }>(
      `/api/notifications${query ? `?${query}` : ''}`
    )
  },

  getUnreadCount: () =>
    api<{ count: number }>('/api/notifications/unread-count'),

  markAsRead: (id: string) =>
    api<{ notification: Notification }>(`/api/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: () =>
    api<{ message: string }>('/api/notifications/read-all', {
      method: 'PUT',
    }),

  delete: (id: string) =>
    api<{ message: string }>(`/api/notifications/${id}`, {
      method: 'DELETE',
    }),
}

// Type exports
export type SessionUser = {
  id: string
  role: 'tenant' | 'seller' | 'manager' | 'admin'
  fullName: string
  name: string
  email: string
  phone: string
  initials: string
  title: string
  sellerStatus?: 'none' | 'pending' | 'active' | 'rejected'
  sellerProfile?: SellerProfile
}

export type SellerProfile = {
  id: string
  userId: string
  idNumber?: string
  brand?: string
  address?: string
  docs?: string[]
  status: 'none' | 'pending' | 'active' | 'rejected'
  submittedAt?: string
  reviewedAt?: string
  reviewerId?: string
  reviewNote?: string
  trustScore?: number
  responseRate?: number
}

export type Listing = {
  id: string
  sellerId: string
  title: string
  roomType: string
  houseNumber?: string
  alley?: string
  street?: string
  ward?: string
  district?: string
  city?: string
  lat?: number
  lng?: number
  rent: number
  depositMonths: number
  electricity?: number
  electricityType?: string
  water?: number
  waterType?: string
  internet?: number
  sanitation?: number
  parkingBike?: number
  parkingCar?: number
  managementFee?: number
  area?: number
  direction?: string
  floor?: number
  totalFloors?: number
  furniture: boolean
  pets: boolean
  availableFrom?: string
  vacantNow: boolean
  verified: boolean
  vip: boolean
  vipExpiresAt?: string
  isVipActive?: boolean
  highTrust: boolean
  status: 'draft' | 'pending' | 'active' | 'rejected' | 'inactive'
  views: number
  rating?: number
  reviewCount: number
  image?: string
  photos: string[]
  amenities: string[]
  roadWidth?: number
  carAccess: boolean
  truckAccess: boolean
  rejectReason?: string
  priceAlert?: boolean
  coordMismatch?: boolean
  seller?: {
    id: string
    fullName: string
    phone: string
    sellerProfile?: {
      trustScore?: number
      responseRate?: number
      verified?: boolean
    }
  }
  createdAt?: string
}

export type RegisterData = {
  phone: string
  password: string
  fullName: string
  email?: string
  role?: 'tenant' | 'seller'
}

export type ProfileData = {
  fullName: string
  email?: string
}

export type SellerProfileData = {
  idNumber?: string
  brand?: string
  address?: string
  docs?: string[]
}

export type ListingSearchParams = {
  page?: number
  limit?: number
  roomType?: string
  minRent?: number
  maxRent?: number
  minArea?: number
  maxArea?: number
  district?: string
  ward?: string
  verified?: boolean
  vip?: boolean
  furniture?: boolean
  pets?: boolean
  vacantNow?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type CreateListingData = {
  title: string
  roomType: 'phong-tro' | 'chung-cu-mini' | 'nha-tro' | 'can-ho'
  houseNumber?: string
  alley?: string
  street?: string
  ward?: string
  district?: string
  city?: string
  lat?: number
  lng?: number
  rent: number
  depositMonths?: number
  electricity?: number
  electricityType?: 'state' | 'business'
  water?: number
  waterType?: 'person' | 'unit'
  internet?: number
  sanitation?: number
  parkingBike?: number
  parkingCar?: number
  managementFee?: number
  area?: number
  direction?: string
  floor?: number
  totalFloors?: number
  furniture?: boolean
  pets?: boolean
  availableFrom?: string
  vacantNow?: boolean
  photos?: string[]
  amenities?: string[]
  roadWidth?: number
  carAccess?: boolean
  truckAccess?: boolean
  status?: 'draft' | 'pending' | 'active' | 'rejected' | 'inactive'
}

export type ListingBadges = {
  verified?: boolean
  vip?: boolean
  highTrust?: boolean
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type SellerDashboardStats = {
  listings: {
    draft: number
    pending: number
    active: number
    rejected: number
    inactive: number
  }
  newLeads: number
  pendingAppointments: number
  totalViews: number
}

export type SellerLead = {
  id: string
  listingId?: string
  listing?: { id: string; title: string }
  sellerId: string
  name: string
  phone: string
  message?: string
  when?: string
  status: 'new' | 'contacted' | 'interested' | 'not_interested'
  createdAt: string
}

export type Appointment = {
  id: string
  listingId: string
  listing?: { id: string; title: string; image?: string; rent?: number }
  tenantId?: string
  tenant?: { id: string; fullName: string; phone: string }
  when: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  phone?: string
  note?: string
  createdAt: string
}

export type SellerRequest = {
  id: string
  userId: string
  user: {
    id: string
    fullName: string
    phone: string
    email?: string
    createdAt: string
  }
  idNumber?: string
  brand?: string
  address?: string
  docs?: string[]
  status: 'none' | 'pending' | 'active' | 'rejected'
  submittedAt?: string
  reviewedAt?: string
  reviewerId?: string
  reviewNote?: string
}

export type Report = {
  id: string
  listingId?: string
  reporterId: string
  reporter?: { id: string; fullName: string; phone: string; email?: string; role?: string }
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  reason: string
  tone?: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  resolution?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
  listing?: {
    id: string
    title: string
    price: number // rent from Listing, mapped for frontend
    status: string
    image?: string
    photos?: string // JSON array from Listing
    images?: string[] // normalized from photos
    sellerId: string
  }
}

export type ManagerStats = {
  pending: number
  approvedToday: number
  rejectedToday: number
  totalUsers: number
}

export type AuditLog = {
  id: string
  actorId: string
  actor?: { id: string; fullName: string; role: string }
  action: string
  target?: string
  targetType?: string
  details?: string
  createdAt: string
}

export type User = {
  id: string
  fullName: string
  phone: string
  email?: string
  role: string
  initials?: string
  title?: string
  createdAt: string
  sellerProfile?: { status: string }
}

export type AdminDashboardStats = {
  totalUsers: number
  totalListings: number
  activeListings: number
  pendingListings: number
  totalSellers: number
  totalTransactions: number
  totalRevenue: number
  newUsersThisWeek: number
  newListingsThisWeek: number
  listingsByStatus: Record<string, number>
  usersByRole: Record<string, number>
}

export type Transaction = {
  id: string
  userId: string
  user?: { id: string; fullName: string; phone: string }
  type: string
  amount: number
  method?: string
  status: string
  description?: string
  vnpayTxRef?: string
  vnpayDate?: string
  createdAt: string
}

export type SystemConfig = {
  id: string
  key: string
  value: string
  description?: string
}

export type TenantStats = {
  appointments: number
  savedListings: number
  reviews: number
}

export type Reservation = {
  id: string
  tenantId: string
  sellerId: string
  listingId: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  note?: string
  sellerNote?: string
  expiresAt?: string
  approvedAt?: string
  rejectedAt?: string
  cancelledAt?: string
  cancelledBy?: string
  createdAt: string
  updatedAt: string
  listing?: {
    id: string
    title: string
    image?: string
    district?: string
    city?: string
    rent: number
  }
}

export type Contract = {
  id: string
  listingId: string
  sellerId: string
  tenantId: string
  reservationId?: string
  title: string
  contractNumber?: string
  startDate?: string
  endDate?: string
  monthlyRent?: number
  depositAmount?: number
  fileKey: string
  originalFileName: string
  mimeType: string
  fileSize: number
  status: 'active_record' | 'archived' | 'revoked'
  parentId?: string
  version: number
  uploadedAt: string
  createdAt: string
  updatedAt: string
  listing?: {
    id: string
    title: string
    image?: string
    district?: string
    city?: string
  }
}

// Seller API types (used by sellerApi)
export type SellerReservation = Reservation & {
  tenant?: {
    id: string
    fullName: string
    phone: string
  }
}

export type SellerReservationDetail = SellerReservation

export type SellerContract = Contract & {
  tenant?: {
    id: string
    fullName: string
    phone: string
  }
}

export type SellerContractDetail = SellerContract

export type Notification = {
  id: string
  userId: string
  type: 'tin' | 'hen' | 'canhbao' | 'system' | 'hopdong' | 'coc' | 'appointment'
  title: string
  body?: string
  message?: string
  link?: string
  read: boolean
  metadata?: Record<string, unknown>
  createdAt: string
}

export type CreateReviewData = {
  listingId: string
  score: number
  photoMatch?: number
  landlord?: number
  security?: number
  hygiene?: number
  text?: string
  verifiedStay?: boolean
}

export type Review = {
  id: string
  listingId: string
  authorId: string
  author?: { id: string; fullName: string; initials: string }
  score: number
  photoMatch?: number
  landlord?: number
  security?: number
  hygiene?: number
  text?: string
  verifiedStay: boolean
  createdAt: string
  listing?: {
    id: string
    title: string
    image?: string
    district?: string
    city?: string
  }
}

export type TenantReview = {
  id: string
  listingId: string
  authorId: string
  score: number
  photoMatch?: number
  landlord?: number
  security?: number
  hygiene?: number
  text?: string
  verifiedStay: boolean
  createdAt: string
  listing?: {
    id: string
    title: string
    image?: string
    district?: string
    city?: string
  }
}

export type Package = {
  id: string
  name: string
  price: number
  days: number
  features: string[]
  popular?: boolean
}

export type Wallet = {
  id: string
  userId: string
  balance: number
  totalSpent: number
}

export type UploadedFile = {
  url: string
  filename: string
  originalName: string
  size: number
  mimetype: string
}

// Geocode API
export interface GeocodeResult {
  lat: number
  lng: number
  displayName: string
  type: string
  class?: string
  importance: number
  address?: Record<string, string>
  serviceArea: {
    valid: boolean
    area: string | null
    historical?: string | null
  }
  building?: string | null
  project?: string | null
  score?: number
}

export interface GeocodeSearchParams {
  query?: string  // Free-form search
  houseNumber?: string
  street?: string
  ward?: string
  district?: string
  city?: string
  limit?: number
}

export interface GeocodeSearchResponse {
  results: GeocodeResult[]
  searchQuery?: string
  message?: string | null
  cached?: boolean
}

export const geocodeApi = {
  // Search for addresses - free-form or structured
  search: (params: GeocodeSearchParams) =>
    api<GeocodeSearchResponse>('/api/geocode/search', {
      method: 'POST',
      body: params,
    }),

  // Reverse geocode (click on map)
  reverse: (lat: number, lng: number) =>
    api<GeocodeResult & { cached?: boolean; note?: string }>('/api/geocode/reverse', {
      method: 'POST',
      body: { lat, lng },
    }),

  // Validate if coordinates are in service area
  validate: (lat: number, lng: number) =>
    api<{ valid: boolean; area: string | null; historical: string | null; lat: number; lng: number }>(
      `/api/geocode/validate?lat=${lat}&lng=${lng}`
    ),
}

// Payment API
export const paymentApi = {
  createPayment: (amount: number, packageId: string, description?: string) =>
    api<{ success: boolean; paymentUrl: string; transactionId: string; amount: number }>('/api/payment/create', {
      method: 'POST',
      body: { amount, packageId, description },
    }),

  getStatus: (txnRef: string) =>
    api<{ transaction: Transaction }>(`/api/payment/status/${txnRef}`),

  getHistory: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return api<{ transactions: Transaction[]; pagination: Pagination }>(
      `/api/payment/history${query ? `?${query}` : ''}`
    )
  },

  getWallet: () =>
    api<{ wallet: Wallet }>('/api/payment/wallet'),

  getPackages: () =>
    api<{ packages: Package[] }>('/api/payment/packages'),

  // Manual bank transfer APIs
  createOrder: (packageId: string) =>
    api<{ success: boolean; order: any }>('/api/payment/create-order', {
      method: 'POST',
      body: { packageId },
    }),

  getMyOrders: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.status) searchParams.append('status', params.status || '')
    const query = searchParams.toString()
    return api<{ orders: any[]; pagination: Pagination }>(
      `/api/payment/my-orders${query ? `?${query}` : ''}`
    )
  },

  getVietQR: (orderId: string) =>
    api<{ success: boolean; qrUrl: string; bankInfo: any; transferInfo: any }>(`/api/payment/vietqr/${orderId}`),

  uploadProof: (orderId: string, file: File) => {
    const formData = new FormData()
    formData.append('orderId', orderId)
    formData.append('proof', file)
    return api<{ success: boolean; order: any }>('/api/payment/upload-proof', {
      method: 'POST',
      body: formData as any,
    } as any)
  },

  getMySubscription: () =>
    api<{ subscriptions: any[] }>('/api/payment/my-subscription'),

  // Purchase package using wallet balance
  purchaseWallet: (packageId: string) =>
    api<{ success: boolean; message: string; wallet: { id: string; balance: number; totalSpent: number }; subscription: { id: string; packageName: string; expiresAt: string }; stars?: { granted: boolean; amount?: number } }>(
      '/api/payment/purchase-wallet',
      { method: 'POST', body: { packageId } }
    ),
}

// Star System API
export interface StarBalance {
  balance: number
  totalEarned: number
  totalSpent: number
  batches: Array<{
    id: string
    packageId: string
    originalAmount: number
    remainingAmount: number
    expiresAt: string
    daysUntilExpiry: number
  }>
}

export interface StarTransaction {
  id: string
  type: 'GRANT' | 'SPEND' | 'EXPIRE' | 'REFUND'
  amount: number
  balanceAfter: number
  description: string
  subscriptionId?: string
  listingId?: string
  boostOrderId?: string
  createdAt: string
}

export interface StarTransactionsResponse {
  transactions: StarTransaction[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface StarPurchaseResponse {
  success: boolean
  message: string
  stars: {
    spent: number
    remaining: number
  }
  vip: {
    expiresAt: string
    daysAdded: number
  }
  listing: {
    id: string
    vipExpiresAt: string
  }
}

export const starsApi = {
  // Get star balance
  getBalance: () =>
    api<StarBalance>('/api/seller/stars/balance'),

  // Get star transaction history
  getTransactions: (params?: { type?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.append('type', params.type)
    if (params?.limit) searchParams.append('limit', String(params.limit || 50))
    if (params?.offset) searchParams.append('offset', String(params.offset || 0))
    const query = searchParams.toString()
    return api<StarTransactionsResponse>(`/api/seller/stars/transactions${query ? `?${query}` : ''}`)
  },

  // Purchase VIP boost using stars
  purchaseBoost: (listingId: string, days: number, boostOrderId?: string) =>
    api<StarPurchaseResponse>('/api/seller/stars/purchase-boost', {
      method: 'POST',
      body: { listingId, days, boostOrderId },
    }),
}

// Wallet Deposit API
export interface WalletDeposit {
  id: string
  depositRef: string
  userId: string
  amount: number
  bankName: string
  bankBin: string
  accountNumber: string
  accountHolder: string
  transferRef: string
  status: 'PENDING' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
  proofUrl?: string
  proofUploadedAt?: string
  reviewedAt?: string
  reviewedBy?: string
  reviewerNote?: string
  verifiedBankTx?: string
  verifiedDate?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export const walletDepositApi = {
  // Create a new deposit request
  createDeposit: (amount: number) =>
    api<{ success: boolean; deposit: WalletDeposit }>('/api/payment/deposit', {
      method: 'POST',
      body: { amount },
    }),

  // Get user's deposits
  getMyDeposits: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', String(params.page))
    if (params?.limit) searchParams.append('limit', String(params.limit))
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return api<{ deposits: WalletDeposit[]; pagination: Pagination }>(
      `/api/payment/deposits${query ? `?${query}` : ''}`
    )
  },

  // Get single deposit details
  getDeposit: (id: string) =>
    api<{ deposit: WalletDeposit }>(`/api/payment/deposit/${id}`),

  // Get VietQR for a deposit
  getVietQR: (id: string) =>
    api<{ success: boolean; qrUrl: string; bankInfo: any; transferInfo: any }>(
      `/api/payment/deposit/${id}/vietqr`
    ),

  // Submit payment proof (as base64)
  submitProof: (id: string, proofBase64: string, proofMimeType?: string) =>
    api<{ success: boolean; deposit: Partial<WalletDeposit> }>(
      `/api/payment/deposit/${id}/submit-proof`,
      {
        method: 'POST',
        body: { proofBase64, proofMimeType: proofMimeType || 'image/jpeg' },
      }
    ),

  // Cancel a pending deposit
  cancelDeposit: (id: string) =>
    api<{ success: boolean; deposit: WalletDeposit }>(
      `/api/payment/deposit/${id}/cancel`,
      { method: 'POST' }
    ),
}

export { ApiError }
