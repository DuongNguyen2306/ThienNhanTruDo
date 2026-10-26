/**
 * `(seller)` group — the SELLER (chủ trọ) interface.
 *
 * Architecture (identical to the tenant side after BUG-01):
 *
 *   (seller)/_layout.tsx          ← THIS FILE. A Stack, plus the guard.
 *   (seller)/(tabs)/_layout.tsx   ← the bottom navigation, 5 tabs only.
 *   (seller)/<other screens>      ← pushed on the Stack, never a tab.
 *
 * The five tabs:
 *
 *   (tabs)/tong-quan  · (tabs)/tin-dang  · (tabs)/lich-hen-xem
 *   (tabs)/khach-hang · (tabs)/tai-khoan-chu-tro
 *
 * Everything else is a sibling of `(tabs)`, so Expo Router can never turn
 * one of them into a tab:
 *
 *   dang-tin · sua-tin/[id] · chi-tiet-khach-hang/[id] · chinh-sua-ho-so
 *   thong-bao · bao-mat · doi-mat-khau
 *
 * Access control lives in `useAuthGuard`: a signed-in tenant who opens a
 * seller screen is redirected to their own home, and the backend still
 * refuses every seller API call from a non-seller token.
 */

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { colors } from '@/constants/theme';

/** `(tabs)` is the base of the stack, so a deep link still lands on a tab. */
export const unstable_settings = {
  initialRouteName: '(tabs)',
  anchor: '(tabs)',
};

export default function SellerLayout() {
  const { isChecking, canAccess, redirect } = useAuthGuard({ allowedRole: 'seller' });

  if (isChecking) {
    return <LoadingState fullScreen message="Đang xác thực…" />;
  }

  if (!canAccess) {
    if (redirect) {
      return <Redirect href={redirect as never} />;
    }
    // Signed in with a role that has no mobile interface (manager/admin).
    return <LoadingState fullScreen message="Tài khoản không được phép truy cập ứng dụng di động." />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* --- Bottom navigation ------------------------------------- */}
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />

      {/* --- Screens pushed on top of the tabs ---------------------- */}
      <Stack.Screen name="dang-tin" options={{ title: 'Đăng tin mới' }} />
      <Stack.Screen name="sua-tin/[id]" options={{ title: 'Chỉnh sửa tin' }} />
      <Stack.Screen name="chi-tiet-khach-hang/[id]" options={{ title: 'Chi tiết khách hàng' }} />
      <Stack.Screen name="chinh-sua-ho-so" options={{ title: 'Chỉnh sửa hồ sơ' }} />
      <Stack.Screen name="thong-bao" options={{ title: 'Thông báo' }} />
      <Stack.Screen name="bao-mat" options={{ title: 'Bảo mật' }} />
      <Stack.Screen name="doi-mat-khau" options={{ title: 'Đổi mật khẩu' }} />
    </Stack>
  );
}
