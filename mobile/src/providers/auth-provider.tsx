/**
 * Session provider.
 *
 * One login system serves both roles. After signing in, the backend returns
 * the user and their role; this provider keeps that session in React state
 * and persists the JWT in the device keychain.
 *
 * Route groups in Expo Router are organisational only — they do NOT protect
 * anything. The actual guard lives in `useAuthGuard` (see
 * `src/hooks/use-auth-guard.ts`) and is applied by each role layout.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ApiError, authApi } from '@/lib/api-client';
import { secureTokenStore } from '@/lib/secure-token-store';
import { isMobileRole, type ApiUser, type MobileRole, type SessionUser } from '@/types/auth';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  /** The signed-in user, or `null` when there is no session. */
  user: SessionUser | null;
  /** True while the stored session is still being restored. */
  isInitializing: boolean;
  /** True when a valid session exists. */
  isAuthenticated: boolean;
  status: AuthStatus;
  /** Sign in with a phone number or e-mail address. */
  signIn: (identifier: string, password: string) => Promise<void>;
  /**
   * Finish a registration with the e-mail OTP.
   *
   * The backend issues a real token once the address is proven, so the
   * user is signed in immediately — no second password entry.
   */
  verifyRegistrationOtp: (email: string, otp: string) => Promise<void>;
  /** Sign out and wipe the stored token. */
  signOut: () => Promise<void>;
  /** Re-read the session from the backend. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isInitializing: true,
  isAuthenticated: false,
  status: 'initializing',
  signIn: async () => {},
  verifyRegistrationOtp: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

/** Map the backend's user shape onto the session shape used in the app. */
function toSessionUser(apiUser: ApiUser): SessionUser {
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
    sellerProfile: apiUser.sellerProfile ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');

  /** Drop the local session and the stored token. */
  const clearSession = useCallback(async () => {
    await secureTokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  /**
   * Restore a stored session on cold start.
   *
   * The token alone is not trusted: the session is validated against
   * `GET /api/auth/me` so an expired or revoked token cannot grant access.
   */
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = await secureTokenStore.get();

      if (!token) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }

      try {
        const { user: apiUser } = await authApi.getMe();

        if (cancelled) return;

        // MANAGER and ADMIN have no mobile interface. A session with one of
        // those roles is not usable here, so it is discarded.
        if (!isMobileRole(apiUser.role)) {
          await clearSession();
          return;
        }

        setUser(toSessionUser(apiUser));
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        // The token is invalid, expired, or the server is unreachable. The
        // session cannot be validated, so it is dropped and the user can sign
        // in again.
        await clearSession();
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const result = await authApi.login(identifier.trim(), password);

      if (!isMobileRole(result.user.role)) {
        await clearSession();
        throw new ApiError('Tài khoản này không được phép sử dụng ứng dụng di động.', 403, {
          error: 'ROLE_NOT_SUPPORTED',
        });
      }

      await secureTokenStore.set(result.token);
      setUser(toSessionUser(result.user));
      setStatus('authenticated');
    },
    [clearSession],
  );

  /**
   * Consume the registration OTP and open a session.
   *
   * The backend returns a real token, so the JWT is stored in the keychain
   * exactly like a password sign-in.
   */
  const verifyRegistrationOtp = useCallback(
    async (email: string, otp: string) => {
      const result = await authApi.verifyEmail(email.trim().toLowerCase(), otp.trim());

      if (!isMobileRole(result.user.role)) {
        await clearSession();
        throw new ApiError('Tài khoản này không được phép sử dụng ứng dụng di động.', 403, {
          error: 'ROLE_NOT_SUPPORTED',
        });
      }

      await secureTokenStore.set(result.token);
      setUser(toSessionUser(result.user));
      setStatus('authenticated');
    },
    [clearSession],
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const refresh = useCallback(async () => {
    try {
      const { user: apiUser } = await authApi.getMe();
      if (!isMobileRole(apiUser.role)) {
        await clearSession();
        return;
      }
      setUser(toSessionUser(apiUser));
      setStatus('authenticated');
    } catch {
      await clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing: status === 'initializing',
      isAuthenticated: status === 'authenticated' && user !== null,
      status,
      signIn,
      verifyRegistrationOtp,
      signOut,
      refresh,
    }),
    [user, status, signIn, verifyRegistrationOtp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

/** The role the current session may use, or `null` when signed out. */
export function useSessionRole(): MobileRole | null {
  const { user } = useAuth();
  return user && isMobileRole(user.role) ? user.role : null;
}
