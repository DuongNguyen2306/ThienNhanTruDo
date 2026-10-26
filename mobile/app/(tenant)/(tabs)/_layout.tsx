/**
 * `(tenant)/(tabs)` group — the BOTTOM NAVIGATION of the tenant interface.
 *
 * Exactly five tabs, in this order:
 *
 *   1. trang-chu    → Trang chủ
 *   2. tim-phong    → Tìm phòng
 *   3. da-luu       → Đã lưu
 *   4. lich-hen     → Lịch hẹn
 *   5. tai-khoan    → Tài khoản
 *
 * Every other tenant screen (room detail, gallery, booking, profile edit,
 * landlord application, map) lives OUTSIDE this group, in the parent
 * `(tenant)` Stack, so Expo Router never turns them into a tab.
 *
 * Access control is applied once, by the parent `(tenant)` layout.
 *
 * BUG-03 — the bar height and its bottom padding are now derived from the
 * real safe-area inset instead of a hardcoded 62 px:
 *
 *   height        = CONTENT_HEIGHT + insets.bottom
 *   paddingBottom = insets.bottom (+ a small breathing space)
 *
 * On an iPhone with a Home Indicator `insets.bottom` is ~34, so the icons
 * and the labels sit above the indicator and nothing is clipped. On an
 * iPhone without one, and on Android, `insets.bottom` is 0 (or the small
 * gesture-bar inset) and the bar collapses back to its normal height — no
 * oversized empty strip.
 */

import { Tabs } from 'expo-router';
import { Bookmark, CalendarDays, Home, Search, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontSize } from '@/constants/theme';

/** The tab opened when the group is entered without a child path. */
export const unstable_settings = {
  initialRouteName: 'trang-chu',
};

/** Height of the bar itself: icon (21) + label (≈12) + the vertical padding. */
const CONTENT_HEIGHT = 56;

/** Extra space between the labels and the Home Indicator. */
const BOTTOM_GAP = 4;

export default function TenantTabsLayout() {
  const insets = useSafeAreaInsets();

  // The real inset of the device, never a hardcoded guess.
  const bottomInset = Math.max(0, insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.ink,
          borderTopWidth: 2,
          height: CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset > 0 ? bottomInset + BOTTOM_GAP : 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.medium,
          fontSize: fontSize.xs,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        sceneStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="trang-chu"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => <Home size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="tim-phong"
        options={{
          title: 'Tìm phòng',
          tabBarIcon: ({ color }) => <Search size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="da-luu"
        options={{
          title: 'Đã lưu',
          tabBarIcon: ({ color }) => <Bookmark size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="lich-hen"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color }) => <CalendarDays size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="tai-khoan"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <User size={21} color={color} strokeWidth={2.4} />,
        }}
      />
    </Tabs>
  );
}
