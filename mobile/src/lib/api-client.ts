/**
 * API client for the Thiên Nhãn backend.
 *
 * The backend is the SAME Express service the website uses — this mobile app
 * introduces no new backend. Only the storage of the JWT differs: the web
 * app keeps it in `localStorage`, the mobile app keeps it in the device
 * keychain via `expo-secure-store`.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';

import { secureTokenStore } from './secure-token-store';
import type {
  ApiUser,
  LoginErrorPayload,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '@/types/auth';
import type {
  Appointment,
  Listing,
  ListingSearchParams,
  ListingSearchResponse,
  SavedListingsResponse,
  SellerApplicationStatus,
  TenantProfile,
  TenantStats,
} from '@/types/listing';
import type {
  AppNotification,
  SellerAppointment,
  SellerDashboardStats,
  SellerLead,
  SellerListing,
  SellerListingInput,
  SellerProfile,
  SellerUploadedFile,
} from '@/types/seller';

/**
 * Base URL of the Express backend.
 *
 * Set `EXPO_PUBLIC_API_URL` in `mobile/.env` to point at your own machine.
 * The default matches the backend's local development port.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? 'http://localhost:3005';

/** Request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 15000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // The `Content-Type` is deliberately NOT pinned here.
  //
  // Axios v1 transforms a `FormData` body into a JSON string whenever the
  // request carries `application/json` — which would destroy the upload.
  // Leaving the header unset lets Axios set `application/json` for plain
  // objects and `multipart/form-data; boundary=…` for a `FormData`, which
  // is exactly what the multer endpoint needs.
});

/**
 * Attach the stored JWT to every outgoing request.
 *
 * The token is read from SecureStore on each request rather than cached in
 * memory, so a sign-out (or a token rotation) takes effect immediately.
 */
apiClient.interceptors.request.use(async (config) => {
  const token = await secureTokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** A failed API call, carrying the HTTP status and the backend payload. */
export class ApiError extends Error {
  readonly status: number;
  readonly data?: LoginErrorPayload;

  constructor(message: string, status: number, data?: LoginErrorPayload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  /** The account exists but its e-mail has not been proven yet. */
  get requiresVerification(): boolean {
    return this.status === 403 && this.data?.requiresVerification === true;
  }
}

/**
 * Turn an axios failure into a readable message.
 *
 * The backend's validation middleware answers with a generic
 * "Dữ liệu không hợp lệ" plus a `details` array; the per-field messages
 * are far more useful, so they are surfaced instead.
 */
function describeError(error: unknown): { message: string; status: number; data?: LoginErrorPayload } {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    const data = error.response?.data as LoginErrorPayload | undefined;

    if (error.code === 'ECONNABORTED') {
      return { message: 'Yêu cầu hết thời gian. Vui lòng thử lại.', status: 408, data };
    }

    if (!error.response) {
      return {
        message: 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối.',
        status: 0,
        data,
      };
    }

    if (Array.isArray(data?.details) && data.details.length > 0) {
      const messages = data.details
        .map((d) => (d.msg ? (d.path ? `${d.msg} (${d.path})` : d.msg) : ''))
        .filter(Boolean);

      if (messages.length > 0) {
        const headline = data?.error;
        return {
          message:
            headline && headline !== 'Dữ liệu không hợp lệ'
              ? `${headline}: ${messages.join(', ')}`
              : messages.join(', '),
          status,
          data,
        };
      }
    }

    return {
      message: data?.error ?? 'Lỗi máy chủ. Vui lòng thử lại.',
      status,
      data,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'Lỗi không xác định.',
    status: 0,
  };
}

/** Run an axios call and normalise any failure into an `ApiError`. */
async function request<T>(fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const response = await fn();
    return response.data;
  } catch (error) {
    const { message, status, data } = describeError(error);
    throw new ApiError(message, status, data);
  }
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

/** The shape returned when an e-mail OTP is accepted. */
export interface VerifyEmailResponse {
  message: string;
  requiresVerification: boolean;
  user: ApiUser;
  token: string;
}

/** The shape returned by every "we sent you a code" endpoint. */
export interface OtpSentResponse {
  message: string;
  sent?: boolean;
  alreadyVerified?: boolean;
  resendAvailableIn: number;
}

export const authApi = {
  /**
   * Sign in with a phone number OR an e-mail address.
   *
   * The backend accepts the identifier in `identifier`; `phone` is sent as
   * well so an older backend build still works.
   */
  login: (identifier: string, password: string) =>
    request<LoginResponse>(() =>
      apiClient.post<LoginResponse>('/api/auth/login', {
        identifier,
        phone: identifier,
        password,
      }),
    ),

  /** The currently signed-in user. Used to validate a restored session. */
  getMe: () => request<{ user: ApiUser }>(() => apiClient.get('/api/auth/me')),

  /**
   * Create a TENANT account.
   *
   * The backend ignores any client-supplied role and always creates a
   * TENANT. The account is created UNVERIFIED and an OTP is e-mailed, so
   * the response carries no token — sign-in is refused until the address
   * is proven.
   */
  register: (payload: RegisterRequest) =>
    request<RegisterResponse>(() => apiClient.post<RegisterResponse>('/api/auth/register', payload)),

  /**
   * Consume the registration OTP (SCENE 005).
   *
   * On success the backend issues a real token, so the user is signed in
   * immediately — no second password entry.
   */
  verifyEmail: (email: string, otp: string) =>
    request<VerifyEmailResponse>(() =>
      apiClient.post<VerifyEmailResponse>('/api/auth/verify-email', { email, otp }),
    ),

  /** Re-send the registration OTP. */
  resendVerification: (email: string) =>
    request<OtpSentResponse>(() =>
      apiClient.post<OtpSentResponse>('/api/auth/resend-verification', { email }),
    ),

  /**
   * Start the password-reset flow (SCENE 006).
   *
   * The response never reveals whether the address is registered.
   */
  forgotPassword: (email: string) =>
    request<OtpSentResponse>(() =>
      apiClient.post<OtpSentResponse>('/api/auth/forgot-password', { email }),
    ),

  /** Re-send the password-reset OTP. */
  resendPasswordReset: (email: string) =>
    request<OtpSentResponse>(() =>
      apiClient.post<OtpSentResponse>('/api/auth/resend-password-reset', { email }),
    ),

  /**
   * Finish the password reset (SCENE 007).
   *
   * The backend invalidates every other session once the password changes.
   */
  resetPassword: (email: string, otp: string, newPassword: string) =>
    request<{ message: string; sessionsInvalidated: boolean }>(() =>
      apiClient.post<{ message: string; sessionsInvalidated: boolean }>('/api/auth/reset-password', {
        email,
        otp,
        newPassword,
      }),
    ),

  /** Update the signed-in user's profile (SCENE 018). */
  updateProfile: (payload: { fullName?: string; email?: string }) =>
    request<{
      message: string;
      requiresEmailConfirmation?: boolean;
      pendingEmail?: string;
      user: ApiUser;
    }>(() => apiClient.put('/api/auth/profile', payload)),

  /**
   * Apply to become a landlord (SCENE 019).
   *
   * The backend only allows a TENANT to apply, and the request is queued
   * for a manager to review.
   */
  applySeller: (payload: { idNumber: string; permanentAddress: string }) =>
    request<{ message: string; status: string }>(() =>
      apiClient.post('/api/auth/apply-seller', payload),
    ),

  /** The current state of the landlord application (SCENE 019). */
  getSellerApplication: () =>
    request<SellerApplicationStatus>(() => apiClient.get('/api/auth/seller-application')),

  /**
   * Change the password of the signed-in account (SCENE 031).
   *
   * The backend rotates the session epoch — every OTHER device is signed
   * out — and returns a fresh token so this device stays signed in. The
   * caller stores that token; without it the current session would die on
   * the next request.
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string; sessionsInvalidated: boolean; token: string; epoch?: number }>(() =>
      apiClient.put('/api/auth/password', { currentPassword, newPassword }),
    ),
};

/* ------------------------------------------------------------------ */
/* Listings                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the query string for a listing search.
 *
 * Only the parameters the backend actually understands are sent, and the
 * booleans are stringified explicitly — the backend parses them with
 * `isBoolean()`, which only accepts "true"/"false".
 */
function buildListingQuery(params: ListingSearchParams): Record<string, string> {
  const query: Record<string, string> = {};

  if (params.page !== undefined) query.page = String(params.page);
  if (params.limit !== undefined) query.limit = String(params.limit);
  if (params.roomType) query.roomType = params.roomType;
  if (params.minRent !== undefined) query.minRent = String(params.minRent);
  if (params.maxRent !== undefined) query.maxRent = String(params.maxRent);
  if (params.minArea !== undefined) query.minArea = String(params.minArea);
  if (params.maxArea !== undefined) query.maxArea = String(params.maxArea);
  if (params.district) query.district = params.district;
  if (params.ward) query.ward = params.ward;
  if (params.vip !== undefined) query.vip = params.vip ? 'true' : 'false';
  if (params.verified !== undefined) query.verified = params.verified ? 'true' : 'false';
  if (params.furniture !== undefined) query.furniture = params.furniture ? 'true' : 'false';
  if (params.pets !== undefined) query.pets = params.pets ? 'true' : 'false';
  if (params.vacantNow !== undefined) query.vacantNow = params.vacantNow ? 'true' : 'false';
  if (params.direction) query.direction = params.direction;
  if (params.sortBy) query.sortBy = params.sortBy;
  if (params.sortOrder) query.sortOrder = params.sortOrder;

  return query;
}

export const listingsApi = {
  /** The public search endpoint — no session required. */
  search: (params: ListingSearchParams = {}) =>
    request<ListingSearchResponse>(() =>
      apiClient.get<ListingSearchResponse>('/api/listings', { params: buildListingQuery(params) }),
    ),

  /** The ten most-viewed active listings, used by the home screen. */
  featured: () => request<{ listings: Listing[] }>(() => apiClient.get('/api/listings/featured')),

  /** A single listing, with its seller and its latest reviews. */
  detail: (id: string) => request<{ listing: Listing }>(() => apiClient.get(`/api/listings/${id}`)),
};

/* ------------------------------------------------------------------ */
/* Tenant                                                              */
/* ------------------------------------------------------------------ */

export const tenantApi = {
  /** The signed-in tenant plus three counters (SCENE 017). */
  profile: () =>
    request<{ user: TenantProfile; stats: TenantStats }>(() => apiClient.get('/api/tenant/profile')),

  /** The listings the tenant saved (SCENE 015). */
  saved: () => request<SavedListingsResponse>(() => apiClient.get('/api/tenant/saved')),

  /** Save a listing (SCENE 011). */
  saveListing: (listingId: string) =>
    request<{ message: string }>(() => apiClient.post(`/api/tenant/saved/${listingId}`)),

  /** Un-save a listing (SCENE 011, SCENE 015). */
  unsaveListing: (listingId: string) =>
    request<{ message: string }>(() => apiClient.delete(`/api/tenant/saved/${listingId}`)),

  /** The tenant's viewing appointments (SCENE 016). */
  appointments: (status?: string) =>
    request<{ appointments: Appointment[]; total: number }>(() =>
      apiClient.get('/api/tenant/appointments', { params: status ? { status } : undefined }),
    ),

  /** Book a viewing appointment (SCENE 013). */
  createAppointment: (payload: { listingId: string; when: string; phone?: string; note?: string }) =>
    request<{ message: string; appointment: Appointment }>(() =>
      apiClient.post('/api/tenant/appointments', payload),
    ),

  /** Cancel an appointment (SCENE 016). */
  cancelAppointment: (id: string) =>
    request<{ message: string }>(() => apiClient.delete(`/api/tenant/appointments/${id}`)),
};

/* ------------------------------------------------------------------ */
/* Seller                                                              */
/* ------------------------------------------------------------------ */

/**
 * The SELLER endpoints.
 *
 * Every one of these routes is mounted under `/api/seller` in
 * `backend/src/routes/seller.js`, behind `authenticate` + `authorize('seller')`.
 * The seller id is NEVER sent by the client: the backend reads it from the
 * JWT, so one seller can never address another seller's data.
 */
export const sellerApi = {
  /** Dashboard counters (SCENE 020). */
  dashboard: () =>
    request<{ stats: SellerDashboardStats }>(() => apiClient.get('/api/seller/dashboard')),

  /** The signed-in seller's own listings (SCENE 021). */
  listings: (status?: string) =>
    request<{ listings: SellerListing[] }>(() =>
      apiClient.get('/api/seller/listings', { params: status ? { status } : undefined }),
    ),

  /** One listing, ownership-checked by the backend (SCENE 023). */
  listing: (id: string) =>
    request<{ listing: SellerListing }>(() => apiClient.get(`/api/seller/listings/${id}`)),

  /** Create a listing — the backend always stores it as `pending` (SCENE 022). */
  createListing: (payload: SellerListingInput) =>
    request<{ message: string; listing: SellerListing }>(() =>
      apiClient.post('/api/seller/listings', payload),
    ),

  /** Update a listing (SCENE 023). Only the fields sent are written. */
  updateListing: (id: string, payload: Partial<SellerListingInput>) =>
    request<{ message: string; listing: SellerListing }>(() =>
      apiClient.put(`/api/seller/listings/${id}`, payload),
    ),

  /** Delete a listing (SCENE 021). */
  deleteListing: (id: string) =>
    request<{ message: string }>(() => apiClient.delete(`/api/seller/listings/${id}`)),

  /** Replace the photo list of a listing (SCENE 023). */
  updateListingPhotos: (id: string, photos: string[]) =>
    request<{ success: boolean; photos: string[] }>(() =>
      apiClient.put(`/api/seller/listings/${id}/photos`, { photos }),
    ),

  /** The seller profile joined with the account (SCENE 027 / 028). */
  profile: () => request<{ profile: SellerProfile }>(() => apiClient.get('/api/seller/profile')),

  /**
   * Update the seller profile (SCENE 028).
   *
   * The backend resets the profile to `pending` on every update, so this
   * is a re-submission for review — the UI says so instead of pretending
   * the change is instantly live.
   */
  updateProfile: (payload: { idNumber?: string; brand?: string; address?: string }) =>
    request<{ message: string; profile: SellerProfile }>(() =>
      apiClient.put('/api/seller/profile', payload),
    ),

  /** The leads of this seller's listings (SCENE 025). */
  leads: () => request<{ leads: SellerLead[] }>(() => apiClient.get('/api/seller/leads')),

  /** Move a lead to another status (SCENE 026). */
  updateLead: (id: string, status: string) =>
    request<{ message: string; lead: SellerLead }>(() =>
      apiClient.put(`/api/seller/leads/${id}`, { status }),
    ),

  /** The appointments booked on this seller's listings (SCENE 024). */
  appointments: (status?: string) =>
    request<{ appointments: SellerAppointment[] }>(() =>
      apiClient.get('/api/seller/appointments', { params: status ? { status } : undefined }),
    ),

  /** Confirm / refuse / complete an appointment (SCENE 024). */
  updateAppointment: (id: string, status: string) =>
    request<{ message: string; appointment: SellerAppointment }>(() =>
      apiClient.put(`/api/seller/appointments/${id}`, { status }),
    ),

  /**
   * Upload listing photos as `multipart/form-data`.
   *
   * `photo` items are the objects React Native's `FormData` accepts
   * (`{ uri, name, type }`). The backend answers with the public URLs,
   * which are then sent as the listing's `photos` array.
   *
   * The `Content-Type` header is deliberately NOT set here: `multipart/
   * form-data` needs the boundary that axios generates, and a hand-written
   * header without it makes the server unable to parse the body. Axios sets
   * the correct header itself as soon as the request body is a `FormData`.
   */
  uploadPhotos: (files: Array<{ uri: string; name: string; type: string }>, listingId?: string) => {
    const body = new FormData();
    files.forEach((file) => {
      // React Native's FormData accepts this shape for a file part.
      body.append('photos', file as unknown as Blob);
    });
    if (listingId) body.append('listingId', listingId);

    return request<{ success: boolean; files: SellerUploadedFile[]; message: string }>(() =>
      apiClient.post('/api/seller/upload', body),
    );
  },
};

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

/** The notifications of the signed-in account (SCENE 029). */
export const notificationsApi = {
  list: (params: { page?: number; limit?: number; type?: string; unreadOnly?: boolean } = {}) =>
    request<{
      notifications: AppNotification[];
      unreadCount: number;
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(() =>
      apiClient.get('/api/notifications', {
        params: {
          page: params.page,
          limit: params.limit,
          type: params.type,
          unreadOnly: params.unreadOnly ? 'true' : undefined,
        },
      }),
    ),

  unreadCount: () =>
    request<{ count: number }>(() => apiClient.get('/api/notifications/unread-count')),

  markRead: (id: string) =>
    request<{ notification: AppNotification }>(() =>
      apiClient.put(`/api/notifications/${id}/read`),
    ),

  markAllRead: () =>
    request<{ message: string }>(() => apiClient.put('/api/notifications/read-all')),

  remove: (id: string) =>
    request<{ message: string }>(() => apiClient.delete(`/api/notifications/${id}`)),
};

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

/**
 * Turn a stored photo path into an absolute URL.
 *
 * The backend answers an upload with a FULL URL built from its own idea of
 * the public host — `http://localhost:3005/uploads/…` when it sees no
 * forwarded host. On a physical phone `localhost` is the PHONE itself, so
 * that URL can never load. The host of the API the app is talking to is
 * therefore always used for the `/uploads` paths.
 *
 * Rows created by the website keep the relative form
 * (`/uploads/<sellerId>/<file>`) and rows created by the app keep the
 * absolute form; both are handled here.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('data:')) return path;

  /**
   * Every uploaded file is served by the backend under `/uploads/…`.
   *
   * The absolute URL the backend handed out can point at a host the phone
   * cannot reach — a deployment URL, `localhost` (which is the PHONE itself
   * on a device), or a proxy. The file is always served by the SAME backend
   * the app is talking to, so the path is re-hosted on the configured API
   * and the old host is dropped.
   */
  const uploadsIndex = path.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return `${API_BASE_URL}${path.slice(uploadsIndex)}`;
  }

  // An absolute URL that already points at the configured API is fine.
  if (/^https?:\/\//i.test(path)) {
    const apiHost = API_BASE_URL.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (apiHost && path.includes(apiHost)) return path;

    // Any other absolute URL (a CDN, an external image) is kept as is.
    return path;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default apiClient;
