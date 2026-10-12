// Mock API for demo mode - simulates backend API responses
import type { AccountRecord } from '@/lib/auth'

export type SessionUser = {
  id: string
  role: 'tenant' | 'seller' | 'manager' | 'admin'
  fullName: string
  name: string
  email: string
  phone: string
  initials: string
  title: string
  sellerStatus?: 'none' | 'pending' | 'active' | 'suspended'
  sellerProfile?: {
    idNumber?: string
    brand?: string
    address?: string
    docs?: string[]
    submittedAt?: string
    reviewedAt?: string
    reviewer?: string
    reviewNote?: string
  }
}

export const authApi = {
  async getMe(): Promise<{ user: SessionUser }> {
    throw new Error('Demo mode - use localStorage')
  },
  async login(_phone: string, _password: string): Promise<{ user: SessionUser; token: string }> {
    throw new Error('Demo mode')
  },
  async register(_payload: { phone: string; password: string; fullName: string; email: string; role: string }): Promise<{ user: SessionUser; token: string }> {
    throw new Error('Demo mode')
  },
  async logout(): Promise<void> {
    // No-op in demo mode
  },
}

export const listingsApi = {
  async getAll(_params?: Record<string, string>): Promise<{ listings: unknown[]; total: number }> {
    return { listings: [], total: 0 }
  },
  async getById(_id: string): Promise<unknown | null> {
    return null
  },
}

export const appointmentsApi = {
  async create(_payload: { listingId: string; date: string; time: string; phone?: string; note?: string }): Promise<unknown> {
    throw new Error('Demo mode')
  },
  async getAll(): Promise<{ appointments: unknown[] }> {
    return { appointments: [] }
  },
}
