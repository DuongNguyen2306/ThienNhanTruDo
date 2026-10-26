/**
 * Shared domain types for the mobile app.
 *
 * These mirror the shapes the Express backend already returns, so no
 * backend change is required.
 */

export type Role = 'tenant' | 'seller' | 'manager' | 'admin';

export type SellerStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface SellerProfile {
  idNumber?: string;
  brand?: string;
  address?: string;
  docs?: string[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewerId?: string;
  reviewNote?: string;
}

export interface SessionUser {
  id: string;
  role: Role;
  fullName: string;
  name: string;
  email: string;
  phone: string;
  initials: string;
  title: string;
  sellerStatus: SellerStatus;
  sellerProfile?: SellerProfile;
}

export interface ApiUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: Role;
  initials: string;
  title: string;
  sellerStatus?: SellerStatus;
  sellerProfile?: SellerProfile | null;
  emailVerified?: boolean;
}

export interface LoginResponse {
  message: string;
  requiresVerification: boolean;
  user: ApiUser;
  token: string;
}

export interface RegisterRequest {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

/**
 * The backend creates the account UNVERIFIED and e-mails a 6-digit OTP.
 * No token is issued until the address is proven, so `token` is absent.
 */
export interface RegisterResponse {
  message: string;
  requiresVerification: boolean;
  email: string;
  phone: string;
  resendAvailableIn: number;
  user: {
    id: string;
    phone: string;
    email: string;
    fullName: string;
    role: Role;
    initials: string;
    title: string;
  };
}

export interface LoginErrorPayload {
  error?: string;
  code?: string;
  requiresVerification?: boolean;
  email?: string;
  retryAfter?: number;
  details?: Array<{ msg?: string; path?: string }>;
}

/**
 * Where a user is allowed to land after signing in.
 *
 * MANAGER and ADMIN have no mobile interface, so they are deliberately
 * absent: a session with one of those roles is not a valid mobile session.
 */
export type MobileRole = Extract<Role, 'tenant' | 'seller'>;

export const isMobileRole = (role: Role | undefined | null): role is MobileRole =>
  role === 'tenant' || role === 'seller';
