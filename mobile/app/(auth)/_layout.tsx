/**
 * `(auth)` group — screens for signed-out visitors.
 *
 * If a session already exists, the visitor is bounced straight to their
 * home screen. This is a convenience redirect, not the security gate; the
 * security gate is `useAuthGuard`.
 */

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  const { isInitializing, isAuthenticated, user } = useAuth();

  if (isInitializing) {
    // The stored session is still being validated. A blank screen would
    // look broken, so the loading state is shown instead.
    return <LoadingState fullScreen message="Đang kiểm tra phiên đăng nhập…" />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'seller') {
      return <Redirect href="/(seller)/(tabs)/tong-quan" />;
    }
    return <Redirect href="/(tenant)/(tabs)/trang-chu" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
