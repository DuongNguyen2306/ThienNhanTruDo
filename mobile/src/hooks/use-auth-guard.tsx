/**
 * Route guard.
 *
 * Expo Router route groups — `(tenant)`, `(seller)`, `(auth)` — are purely
 * organisational: a group does not restrict who may open a screen. This hook
 * is the real gate and is used by each role layout:
 *
 *   - signed out            → redirect to the sign-in screen
 *   - signed in as `tenant` → may only open `(tenant)` screens
 *   - signed in as `seller` → may only open `(seller)` screens
 *   - `manager` / `admin`   → no mobile interface at all
 */

import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';
import type { MobileRole } from '@/types/auth';

export interface AuthGuardOptions {
  /** The role allowed to view the guarded screens. */
  allowedRole: MobileRole;
  /** Where an unauthenticated visitor is sent. */
  signInPath?: string;
}

/**
 * Guard a group of screens behind a session and a role.
 *
 * Returns `true` while the guard is still deciding, so the caller can render
 * a loading state instead of flashing the wrong screen.
 */
export function useAuthGuard({ allowedRole, signInPath = '/(auth)/dang-nhap' }: AuthGuardOptions) {
  const { user, isInitializing, isAuthenticated } = useAuth();
  const router = useRouter();

  const role = user?.role ?? null;
  const hasWrongRole = isAuthenticated && role !== allowedRole;

  useEffect(() => {
    // A signed-in user who lands on the wrong role's screens is sent back to
    // their own home. This runs after the render so the redirect never
    // interrupts the current frame.
    if (hasWrongRole) {
      const home = role === 'seller' ? '/(seller)/(tabs)/tong-quan' : '/(tenant)/(tabs)/trang-chu';
      router.replace(home as never);
    }
  }, [hasWrongRole, role, router]);

  if (isInitializing) {
    return { isChecking: true, canAccess: false, redirect: null };
  }

  if (!isAuthenticated) {
    return { isChecking: false, canAccess: false, redirect: signInPath };
  }

  if (hasWrongRole) {
    return { isChecking: false, canAccess: false, redirect: null };
  }

  return { isChecking: false, canAccess: true, redirect: null };
}

/**
 * A component form of the guard, for use directly inside a layout:
 *
 * ```tsx
 * export default function TenantLayout() {
 *   const { isChecking, canAccess, redirect } = useAuthGuard({ allowedRole: 'tenant' });
 *   if (isChecking) return <LoadingState />;
 *   if (!canAccess && redirect) return <Redirect href={redirect} />;
 *   return <Slot />;
 * }
 * ```
 */
export function AuthGuard({
  allowedRole,
  signInPath,
  children,
}: AuthGuardOptions & { children: React.ReactNode }) {
  const { isChecking, canAccess, redirect } = useAuthGuard({ allowedRole, signInPath });

  if (isChecking) {
    return null;
  }

  if (!canAccess && redirect) {
    return <Redirect href={redirect as never} />;
  }

  return <>{children}</>;
}
