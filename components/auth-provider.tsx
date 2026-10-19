'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEMO_ACCOUNTS, parseSession, SESSION_COOKIE, type Role, type SessionUser,
} from '@/lib/auth'
import { authApi, type SessionUser as ApiSessionUser } from '@/lib/api'

// Fix: Must explicitly check for 'true' string, not just '!== false'
const USE_DEMO_MODE = process.env.NEXT_PUBLIC_USE_DEMO_MODE === 'true'

// Request ID counter for invalidating stale verification responses
let requestIdCounter = 0

// Auth state types
type AuthState = 'initializing' | 'authenticated' | 'unauthenticated' | 'verification_error'
type VerificationErrorReason = 'network_error' | 'server_error' | 'token_invalid' | null

type RegisterPayload = {
  fullName: string
  phone: string
  email: string
  password: string
  role: 'tenant' | 'seller'
  sellerProfile?: {
    idNumber?: string
    brand?: string
    address?: string
    docs?: string[]
  }
}

type AuthContextValue = {
  user: SessionUser | null
  ready: boolean
  authState: AuthState
  verificationError: VerificationErrorReason
  accounts: typeof DEMO_ACCOUNTS
  login: (user: SessionUser, token?: string) => void
  loginById: (id: string) => void
  logout: () => void
  register: (payload: RegisterPayload) => Promise<{ ok: true; account: SessionUser } | { ok: false; error: string }>
  updateAccount: (id: string, patch: Partial<SessionUser>) => void
  switchRole: (role: Role) => void
  signOutEverywhere: () => void
  retryVerification: () => void
  refresh: () => void
  isDemoMode: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  ready: false,
  authState: 'initializing',
  verificationError: null,
  accounts: DEMO_ACCOUNTS,
  login: () => {},
  loginById: () => {},
  logout: () => {},
  register: async () => ({ ok: false as const, error: 'Chua san sang' }),
  updateAccount: () => {},
  switchRole: () => {},
  signOutEverywhere: () => {},
  retryVerification: () => {},
  refresh: () => {},
  isDemoMode: USE_DEMO_MODE,
})

const TOKEN_KEY = 'token'
const USER_KEY = 'thiennhan_user'

function apiUserToSession(apiUser: ApiSessionUser): SessionUser {
  return {
    id: apiUser.id,
    role: apiUser.role,
    fullName: apiUser.fullName,
    name: apiUser.fullName,
    email: apiUser.email ?? '',
    phone: apiUser.phone,
    initials: apiUser.initials ?? '??',
    title: apiUser.title ?? '',
    sellerStatus: (apiUser.sellerStatus ?? 'none') as SessionUser['sellerStatus'],
    sellerProfile: apiUser.sellerProfile ? {
      idNumber: apiUser.sellerProfile.idNumber,
      brand: apiUser.sellerProfile.brand,
      address: apiUser.sellerProfile.address,
      docs: apiUser.sellerProfile.docs,
      submittedAt: apiUser.sellerProfile.submittedAt,
      reviewedAt: apiUser.sellerProfile.reviewedAt,
      reviewerId: apiUser.sellerProfile.reviewerId,
      reviewNote: apiUser.sellerProfile.reviewNote,
    } : undefined,
  }
}

function saveApiUser(user: SessionUser, token?: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

function loadApiUser(): { user: SessionUser | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const userRaw = localStorage.getItem(USER_KEY)
    const token = localStorage.getItem(TOKEN_KEY)
    if (userRaw) {
      return { user: JSON.parse(userRaw) as SessionUser, token }
    }
  } catch {
    // Ignore parse errors
  }
  return { user: null, token: null }
}

function clearApiUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authState, setAuthState] = useState<AuthState>('initializing')
  const [verificationError, setVerificationError] = useState<VerificationErrorReason>(null)
  
  // ready is true when auth state is determined (not initializing)
  const ready = authState !== 'initializing'
  
  // Request ID mechanism: each login/logout increments this
  // Any verification response with old request ID is ignored
  const currentRequestIdRef = useRef<number>(0)
  const isVerifyingRef = useRef<boolean>(false)

  // Verify session with API
  const verifySession = useCallback(async (requestId: number, cachedUser: SessionUser | null, token: string | null) => {
    // Check if this request is still valid (no login/logout happened)
    if (currentRequestIdRef.current !== requestId) {
      console.log('[AuthProvider] Stale verification request, ignoring')
      return
    }
    
    if (isVerifyingRef.current) {
      console.log('[AuthProvider] Verification already in progress, skipping')
      return
    }
    
    isVerifyingRef.current = true
    
    try {
      // If no token, cannot verify - go to unauthenticated
      if (!token) {
        setAuthState('unauthenticated')
        setUser(null)
        return
      }
      
      console.log('[AuthProvider] Verifying saved session, token length:', token?.length)
      
      const apiUser = await authApi.getMe()
      
      // Check if this response is still valid (no login/logout happened)
      if (currentRequestIdRef.current !== requestId) {
        console.log('[AuthProvider] Stale verification response, ignoring')
        return
      }
      
      const sessionUser = apiUserToSession(apiUser.user)
      saveApiUser(sessionUser, token)
      setUser(sessionUser)
      setAuthState('authenticated')
      setVerificationError(null)
      
    } catch (err: unknown) {
      // Check if this error is still relevant
      if (currentRequestIdRef.current !== requestId) {
        console.log('[AuthProvider] Stale error, ignoring')
        return
      }
      
      const error = err as { status?: number; message?: string }
      console.log('[AuthProvider] Verification failed:', error?.status, error?.message)
      
      // Distinguish between different error types
      if (error?.status === 401) {
        // Token is invalid/expired - clear session and go to unauthenticated
        console.log('[AuthProvider] Token invalid, clearing session')
        clearApiUser()
        if (typeof document !== 'undefined') {
          document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
        }
        setUser(null)
        setAuthState('unauthenticated')
        setVerificationError('token_invalid')
      } else if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
        // Server error - use cached user, show verification error state
        console.log('[AuthProvider] Server error, using cached session')
        if (cachedUser) {
          setUser(cachedUser)
          setAuthState('authenticated') // Still authenticated with cached data
          setVerificationError('server_error')
        } else {
          // No cached user, cannot proceed
          setUser(null)
          setAuthState('unauthenticated')
          setVerificationError('server_error')
        }
      } else {
        // Network error or other - use cached user if available
        console.log('[AuthProvider] Network error, using cached session if available')
        if (cachedUser) {
          setUser(cachedUser)
          setAuthState('authenticated')
          setVerificationError('network_error')
        } else {
          setUser(null)
          setAuthState('unauthenticated')
          setVerificationError('network_error')
        }
      }
    } finally {
      isVerifyingRef.current = false
    }
  }, [])

  // Initialize auth on mount
  useEffect(() => {
    const requestId = ++requestIdCounter
    currentRequestIdRef.current = requestId
    
    const initializeAuth = async () => {
      console.log('[AuthProvider] Initializing auth, request ID:', requestId)
      
      if (USE_DEMO_MODE) {
        const cookies = typeof document !== 'undefined' ? document.cookie : ''
        const sessionData = parseSession(
          cookies.split('; ').find(row => row.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1)
        )
        // Check if this request is still valid
        if (currentRequestIdRef.current !== requestId) {
          console.log('[AuthProvider] Stale demo session check, ignoring')
          return
        }
        
        if (sessionData) {
          setUser(sessionData)
          setAuthState('authenticated')
        } else {
          setUser(null)
          setAuthState('unauthenticated')
        }
        return
      }

      // API mode
      const { user: savedUser, token } = loadApiUser()
      
      if (!savedUser || !token) {
        // No saved session - show unauthenticated immediately
        console.log('[AuthProvider] No saved session, showing unauthenticated')
        setUser(null)
        setAuthState('unauthenticated')
        return
      }

      // Has saved session - verify with API
      console.log('[AuthProvider] Has saved session, verifying...')
      setUser(savedUser) // Show cached user while verifying
      setAuthState('authenticated') // Optimistic state while verifying
      
      await verifySession(requestId, savedUser, token)
    }

    initializeAuth()
  }, [verifySession])

  // Retry verification (for user-initiated retry after error)
  const retryVerification = useCallback(() => {
    const { user: savedUser, token } = loadApiUser()
    const requestId = ++requestIdCounter
    currentRequestIdRef.current = requestId
    
    console.log('[AuthProvider] Retrying verification, request ID:', requestId)
    setVerificationError(null)
    verifySession(requestId, savedUser, token)
  }, [verifySession])

  // Refresh user data from API
  const refresh = useCallback(() => {
    const { user: savedUser, token } = loadApiUser()
    if (!savedUser || !token) return
    const requestId = ++requestIdCounter
    currentRequestIdRef.current = requestId
    verifySession(requestId, savedUser, token)
  }, [verifySession])

  const login = useCallback((next: SessionUser, token?: string) => {
    // Increment request ID to invalidate any pending verification responses
    const requestId = ++requestIdCounter
    currentRequestIdRef.current = requestId
    console.log('[AuthProvider] Login, new request ID:', requestId)

    if (USE_DEMO_MODE) {
      if (typeof document !== 'undefined') {
        document.cookie = `${SESSION_COOKIE}=${next.id}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }
      setUser(next)
      setAuthState('authenticated')
      setVerificationError(null)
    } else {
      // API mode: set cookie for server-side proxy access
      if (typeof document !== 'undefined' && next.id) {
        const cookieValue = encodeURIComponent(JSON.stringify({
          id: next.id,
          role: next.role,
          fullName: next.fullName,
          name: next.name,
          email: next.email,
          phone: next.phone,
          initials: next.initials,
          title: next.title,
          sellerStatus: next.sellerStatus,
        }))
        document.cookie = `${SESSION_COOKIE}=${cookieValue}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
      }
      saveApiUser(next, token)
      setUser(next)
      setAuthState('authenticated')
      setVerificationError(null)
    }
  }, [])

  const loginById = useCallback(async (id: string) => {
    if (USE_DEMO_MODE) {
      const account = DEMO_ACCOUNTS.find(a => a.id === id)
      if (account) {
        const session: SessionUser = {
          id: account.id,
          role: account.role,
          fullName: account.fullName,
          name: account.name,
          email: account.email,
          phone: account.phone,
          initials: account.initials,
          title: account.title,
          sellerStatus: account.sellerStatus,
          sellerProfile: account.sellerProfile,
        }
        login(session)
      }
    }
  }, [login])

  const logout = useCallback(async () => {
    // Invalidate pending requests so logout can't be overwritten by verification
    const requestId = ++requestIdCounter
    currentRequestIdRef.current = requestId
    console.log('[AuthProvider] Logout, new request ID:', requestId)
    
    if (!USE_DEMO_MODE) {
      try {
        await authApi.logout()
      } catch {
        // Ignore API errors - we're logging out regardless
      }
      clearApiUser()
    }
    
    // Always clear session cookie
    if (typeof document !== 'undefined') {
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    }
    
    setUser(null)
    setAuthState('unauthenticated')
    setVerificationError(null)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    if (!USE_DEMO_MODE) {
      try {
        const regData = {
          phone: payload.phone.replace(/\s/g, ''),
          password: payload.password,
          fullName: payload.fullName,
          email: payload.email || '',
          role: payload.role,
        }
        const { user: apiUser, token } = await authApi.register(regData)
        const sessionUser = apiUserToSession(apiUser)
        login(sessionUser, token)
        return { ok: true as const, account: sessionUser }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Dang ky that bai'
        return { ok: false as const, error: errorMsg }
      }
    }

    // Demo mode
    const phone = payload.phone.replace(/\s/g, '')
    if (phone.length < 9) {
      return { ok: false as const, error: 'So dien thoai khong hop le' }
    }
    if (payload.password.length < 8 || !/[A-Z]/.test(payload.password) || !/\d/.test(payload.password)) {
      return { ok: false as const, error: 'Mat khau toi thieu 8 ky tu, co chu hoa va so' }
    }

    const initials = payload.fullName
      .split(/\s+/)
      .map(s => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'NV'

    const session: SessionUser = {
      id: `u-${Date.now().toString(36)}`,
      role: payload.role,
      fullName: payload.fullName,
      name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      initials,
      title: payload.role === 'seller' ? 'Chu dang tin (cho duyet)' : 'Nguoi thue',
      sellerStatus: payload.role === 'seller' ? 'pending' : 'none',
      sellerProfile: payload.sellerProfile,
    }

    login(session)
    return { ok: true as const, account: session }
  }, [login])

  const updateAccount = useCallback((id: string, patch: Partial<SessionUser>) => {
    setUser(prev => {
      if (prev && prev.id === id) {
        const updated = { ...prev, ...patch }
        if (!USE_DEMO_MODE) {
          saveApiUser(updated)
        }
        return updated
      }
      return prev
    })
  }, [])

  const switchRole = useCallback((role: Role) => {
    setUser(prev => {
      if (prev) {
        return {
          ...prev,
          role,
          sellerStatus: role === 'seller' ? 'active' : prev.sellerStatus,
        }
      }
      return prev
    })
  }, [])

  const signOutEverywhere = useCallback(() => {
    clearApiUser()
    if (typeof document !== 'undefined') {
      document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    }
    setUser(null)
    setAuthState('unauthenticated')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      authState,
      verificationError,
      accounts: DEMO_ACCOUNTS,
      login,
      loginById,
      logout,
      register,
      updateAccount,
      switchRole,
      signOutEverywhere,
      retryVerification,
      refresh,
      isDemoMode: USE_DEMO_MODE,
    }),
    [user, login, loginById, logout, register, updateAccount, switchRole, signOutEverywhere, retryVerification, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
