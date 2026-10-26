/**
 * `(tenant)` group — the TENANT (người thuê) interface.
 *
 * Architecture (BUG-01 fix):
 *
 *   (tenant)/_layout.tsx          ← THIS FILE. A Stack, plus the guard.
 *   (tenant)/(tabs)/_layout.tsx   ← the bottom navigation, 5 tabs only.
 *   (tenant)/<other screens>      ← pushed on the Stack, never a tab.
 *
 * The five tabs live in the nested `(tabs)` group:
 *
 *   (tabs)/trang-chu · (tabs)/tim-phong · (tabs)/da-luu
 *   (tabs)/lich-hen  · (tabs)/tai-khoan
 *
 * Everything else is a sibling of `(tabs)` and is presented on top of the
 * tab bar, so it can never be auto-registered as a tab:
 *
 *   chi-tiet-phong · thu-vien · dat-hen-xem · dat-hen-thanh-cong
 *   sua-ho-so · dang-ky-chu-tro · ban-do
 *
 * The tab bar is part of the `(tabs)` screen, so it stays visible on the
 * five tabs and is hidden naturally on every pushed screen — no
 * `tabBarStyle: { display: 'none' }` hacks.
 *
 * Access control lives in `useAuthGuard`: a signed-in seller who opens a
 * tenant screen is redirected to their own home.
 */

import { Redirect, Stack } from 'expo-router';

import { LoadingState } from '@/components/ui';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { colors } from '@/constants/theme';

/**
 * The `(tabs)` group is the base of the stack, so a deep link straight to a
 * pushed screen (e.g. a room detail) still has the bottom navigation under it.
 */
export const unstable_settings = {
  initialRouteName: '(tabs)',
  anchor: '(tabs)',
};

export default function TenantLayout() {
  const { isChecking, canAccess, redirect } = useAuthGuard({ allowedRole: 'tenant' });

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
      <Stack.Screen name="chi-tiet-phong" options={{ title: 'Chi tiết phòng' }} />
      <Stack.Screen name="thu-vien" options={{ title: 'Thư viện ảnh' }} />
      <Stack.Screen name="dat-hen-xem" options={{ title: 'Đặt hẹn xem' }} />
      <Stack.Screen name="dat-hen-thanh-cong" options={{ title: 'Đặt hẹn thành công' }} />
      <Stack.Screen name="sua-ho-so" options={{ title: 'Sửa hồ sơ' }} />
      <Stack.Screen name="dang-ky-chu-tro" options={{ title: 'Đăng ký chủ trọ' }} />
      <Stack.Screen name="ban-do" options={{ title: 'Bản đồ' }} />
    </Stack>
  );
}
