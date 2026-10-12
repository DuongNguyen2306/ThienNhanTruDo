'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  DEMO_ACCOUNTS, findAccountById, parseSession, SESSION_COOKIE, toSession, type AccountRecord, type Role, type SessionUser,
} from '@/lib/auth'
import { authApi, type SessionUser as ApiSessionUser } from './api'

// Set to false to use real backend API
const USE_DEMO_MODE = process.env.NEXT_PUBLIC_USE_DEMO_MODE !== 'false'

type RegisterPayload = {
  fullName: string
  phone: string
  email: string
  password: string
  role: 'tenant' | 'seller'
  sellerProfile?: AccountRecord['sellerProfile']
}

type AuthContextValue = {
  user: SessionUser | null
  ready: boolean
  accounts: AccountRecord[]
  login: (user: SessionUser) => void
  loginById: (id: string) => void
  logout: () => void
  register: (payload: RegisterPayload) => Promise<{ ok: true; account: AccountRecord } | { ok: false; error: string }>
  updateAccount: (id: string, patch: Partial<AccountRecord>) => void
  switchRole: (role: Role) => void
  signOutEverywhere: () => void
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  accounts: DEMO_ACCOUNTS,
  login: () => {},
  loginById: () => {},
  logout: () => {},
  register: async () => ({ ok: false as const, error: 'Chưa sẵn sàng' }),
  updateAccount: () => {},
  switchRole: () => {},
  signOutEverywhere: () => {},
  isDemoMode: USE_DEMO_MODE,
})

const ACCOUNTS_KEY = 'thiennhan_accounts'
const CURRENT_KEY = 'thiennhan_current'
const TOKEN_KEY = 'token'

function writeCookie(value: string | null) {
  if (typeof document === 'undefined') return
  if (!value) {
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    return
  }
  document.cookie = `${SESSION_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function readAccountStore(): AccountRecord[] {
  if (typeof window === 'undefined') return DEMO_ACCOUNTS
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return DEMO_ACCOUNTS
    const parsed = JSON.parse(raw) as AccountRecord[]
    if (!Array.isArray(parsed) || parsed.length === 0) return DEMO_ACCOUNTS
    const ids = new Set(parsed.map((a) => a.id))
    const merged = [...parsed]
    for (const acc of DEMO_ACCOUNTS) {
      if (!ids.has(acc.id)) merged.push(acc)
    }
    return merged
  } catch {
    return DEMO_ACCOUNTS
  }
}

function writeAccountStore(accounts: AccountRecord[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function readCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null
  const fromStore = localStorage.getItem(CURRENT_KEY)
  if (fromStore) return fromStore
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${SESSION_COOKIE}=`))
  return match?.slice(SESSION_COOKIE.length + 1) ?? null
}

function readUserFromStores(): SessionUser | null {
  const id = readCurrentUserId()
  if (!id) return null
  const fromStore = readAccountStore().find((a) => a.id === id)
  if (fromStore) return toSession(fromStore)
  return parseSession(id)
}

// Convert API user to SessionUser
function apiUserToSession(apiUser: ApiSessionUser): SessionUser {
  return {
    id: apiUser.id,
    role: apiUser.role,
    fullName: apiUser.fullName,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone,
    initials: apiUser.initials,
    title: apiUser.title,
    sellerStatus: apiUser.sellerStatus ?? 'none',
    sellerProfile: apiUser.sellerProfile ? {
      idNumber: apiUser.sellerProfile.idNumber ?? '',
      brand: apiUser.sellerProfile.brand,
      address: apiUser.sellerProfile.address ?? '',
      docs: apiUser.sellerProfile.docs ?? [],
      submittedAt: apiUser.sellerProfile.submittedAt ?? '',
      reviewedAt: apiUser.sellerProfile.reviewedAt,
      reviewer: apiUser.sellerProfile.reviewer,
      reviewNote: apiUser.sellerProfile.reviewNote,
    } : undefined,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountRecord[]>(DEMO_ACCOUNTS)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setAccounts(readAccountStore())

    // Check for existing API token
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && !USE_DEMO_MODE) {
      // Try to fetch user from API
      authApi.getMe()
        .then(({ user: apiUser }) => {
          setUser(apiUserToSession(apiUser))
        })
        .catch(() => {
          // Token invalid, try demo mode
          setUser(readUserFromStores())
        })
    } else {
      setUser(readUserFromStores())
    }

    setReady(true)
  }, [])

  const persist = useCallback((next: AccountRecord[]) => {
    setAccounts(next)
    writeAccountStore(next)
  }, [])

  const login = useCallback((next: SessionUser) => {
    const account = findAccountById(next.id) ?? DEMO_ACCOUNTS.find((a) => a.id === next.id)
    const session: SessionUser = account ? toSession(account) : { ...next }
    writeCookie(session.id)
    if (typeof window !== 'undefined') localStorage.setItem(CURRENT_KEY, session.id)
    setUser(session)
  }, [])

  const loginById = useCallback((id: string) => {
    const acc = readAccountStore().find((a) => a.id === id)
    if (!acc) return
    login(toSession(acc))
  }, [login])

  const logout = useCallback(async () => {
    if (!USE_DEMO_MODE) {
      try {
        await authApi.logout()
      } catch {
        // Ignore errors
      }
      localStorage.removeItem(TOKEN_KEY)
    }

    writeCookie(null)
    if (typeof window !== 'undefined') localStorage.removeItem(CURRENT_KEY)
    setUser(null)
  }, [])

  const signOutEverywhere = useCallback(() => {
    if (typeof window === 'undefined') return
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    localStorage.removeItem(CURRENT_KEY)
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    if (!USE_DEMO_MODE) {
      try {
        const { user: apiUser, token } = await authApi.register({
          phone: payload.phone.replace(/\s/g, ''),
          password: payload.password,
          fullName: payload.fullName,
          email: payload.email,
          role: payload.role,
        })
        localStorage.setItem(TOKEN_KEY, token)
        setUser(apiUserToSession(apiUser))
        return { ok: true, account: DEMO_ACCOUNTS[0] }
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : 'Đăng ký thất bại'
        return { ok: false, error }
      }
    }

    // Demo mode registration
    const phone = payload.phone.replace(/\s/g, '')
    if (phone.length < 9) return { ok: false, error: 'Số điện thoại không hợp lệ' }
    if (payload.password.length < 8 || !/[A-Z]/.test(payload.password) || !/\d/.test(payload.password)) {
      return { ok: false, error: 'Mật khẩu tối thiểu 8 ký tự, có chữ hoa và số' }
    }
    const store = readAccountStore()
    if (store.some((a) => a.phone.replace(/\s/g, '') === phone)) {
      return { ok: false, error: 'Số điện thoại này đã đăng ký' }
    }
    const initials = payload.fullName
      .split(/\s+/)
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase()
    const newAccount: AccountRecord = {
      id: `u-${Date.now().toString(36)}`,
      role: payload.role,
      fullName: payload.fullName,
      name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      otp: '123456',
      initials: initials || 'NV',
      title: payload.role === 'seller' ? 'Chủ đăng tin (chờ duyệt)' : 'Người thuê',
      sellerStatus: payload.role === 'seller' ? 'pending' : 'none',
      sellerProfile: payload.sellerProfile,
      createdAt: new Date().toISOString().slice(0, 10),
    }
    persist([newAccount, ...store])
    login(toSession(newAccount))
    return { ok: true, account: newAccount }
  }, [persist, login])

  const updateAccount = useCallback((id: string, patch: Partial<AccountRecord>) => {
    const store = readAccountStore()
    const next = store.map((a) => (a.id === id ? { ...a, ...patch } : a))
    persist(next)
    const current = readCurrentUserId()
    if (current === id) {
      const acc = next.find((a) => a.id === id)
      if (acc) setUser(toSession(acc))
    }
  }, [persist])

  const switchRole = useCallback((role: Role) => {
    if (!user) return
    const store = readAccountStore()
    const idx = store.findIndex((a) => a.id === user.id)
    if (idx < 0) return
    const next = [...store]
    next[idx] = { ...next[idx], role, sellerStatus: role === 'seller' ? 'active' : next[idx].sellerStatus }
    persist(next)
    setUser(toSession(next[idx]))
  }, [persist, user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      accounts,
      login,
      loginById,
      logout,
      register,
      updateAccount,
      switchRole,
      signOutEverywhere,
      isDemoMode: USE_DEMO_MODE,
    }),
    [user, ready, accounts, login, loginById, logout, register, updateAccount, switchRole, signOutEverywhere],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
