// API Client for Thiên Nhãn Backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
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

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string })?.error ?? 'Lỗi server',
      res.status,
      data
    )
  }

  return data as T
}

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

  sendOtp: (phone: string) =>
    api<{ message: string }>('/api/auth/otp/send', {
      method: 'POST',
      body: { phone },
    }),

  verifyOtp: (phone: string, otp: string) =>
    api<{ user: SessionUser; token: string }>('/api/auth/otp/verify', {
      method: 'POST',
      body: { phone, otp },
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
}

// Listing API
export const listingApi = {
  search: (params?: ListingSearchParams) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
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
}

// Manager API
export const managerApi = {
  getApprovals: (status = 'pending', page = 1) =>
    api<{ listings: Listing[]; pagination: Pagination }>(
      `/api/manager/approvals?status=${status}&page=${page}`
    ),

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
}

// Admin API
export const adminApi = {
  getDashboard: () =>
    api<{ stats: AdminDashboardStats }>('/api/admin/dashboard'),

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

  deleteListing: (id: string) =>
    api<{ message: string }>(`/api/admin/listings/${id}`, {
      method: 'DELETE',
    }),

  getTransactions: (params?: { type?: string; status?: string; page?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.append('type', params.type)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.page) searchParams.append('page', String(params.page))
    const query = searchParams.toString()
    return api<{ transactions: Transaction[]; pagination: Pagination }>(
      `/api/admin/transactions${query ? `?${query}` : ''}`
    )
  },

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
  depositMonths?: number
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
  furniture?: boolean
  pets?: boolean
  availableFrom?: string
  vacantNow?: boolean
  photos?: string[]
  amenities?: string[]
  roadWidth?: number
  carAccess?: boolean
  truckAccess?: boolean
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
  reporter?: { id: string; fullName: string; phone: string }
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  reason: string
  tone?: string
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed'
  resolution?: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
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
}

export { ApiError }
