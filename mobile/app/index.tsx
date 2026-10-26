/**
 * Entry point — the router's decision screen.
 *
 * Expo Router opens `/` on a cold start. This screen does not render any
 * navigation UI of its own; it shows the brand splash (SCENE 001) for a
 * short moment while the session is validated, then sends the user to the
 * right place:
 *
 *   no session        → /(auth)/onboarding
 *   session: tenant   → /(tenant)/(tabs)/trang-chu
 *   session: seller   → /(seller)/tong-quan
 *   session: manager  → blocked, the session is discarded
 *   session: admin    → blocked, the session is discarded
 *
 * The splash is shown while the stored session is still being validated so
 * the app never flashes the wrong screen.
 */

import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';

import { SplashScreen } from '@/components/brand';
import { useAuth } from '@/providers/auth-provider';

/** Minimum time the brand splash stays on screen (milliseconds). */
const SPLASH_MIN_DURATION = 1600;

export default function IndexScreen() {
  const { isInitializing, isAuthenticated, user, signOut } = useAuth();

  const [splashDone, setSplashDone] = useState(false);
  const startedAt = useRef(Date.now());

  // Hold the splash for a minimum time so it does not flash.
  useEffect(() => {
    const elapsed = Date.now() - startedAt.current;
    const remaining = Math.max(0, SPLASH_MIN_DURATION - elapsed);

    const timer = setTimeout(() => setSplashDone(true), remaining);
    return () => clearTimeout(timer);
  }, []);

  // A MANAGER / ADMIN session has no mobile interface. Drop it and fall
  // back to the sign-in screen.
  const isBlocked = isAuthenticated && user?.role !== 'tenant' && user?.role !== 'seller';

  useEffect(() => {
    if (isBlocked) {
      void signOut();
    }
  }, [isBlocked, signOut]);

  const showSplash = !splashDone || isInitializing || isBlocked;

  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isAuthenticated || !user || isBlocked) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  if (user.role === 'seller') {
    return <Redirect href="/(seller)/(tabs)/tong-quan" />;
  }

  return <Redirect href="/(tenant)/(tabs)/trang-chu" />;
}
