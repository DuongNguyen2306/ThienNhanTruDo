/**
 * `(seller)/(tabs)` — the BOTTOM NAVIGATION of the seller interface.
 *
 * Exactly five tabs, in this order:
 *
 *   1. tong-quan   → Tổng quan
 *   2. tin-dang    → Tin đăng
 *   3. lich-hen-xem → Lịch hẹn
 *   4. khach-hang  → Khách hàng
 *   5. tai-khoan-chu-tro → Tài khoản
 *
 * Every other seller screen (create listing, edit listing, lead detail,
 * profile edit, notifications, security, change password) lives OUTSIDE
 * this group, in the parent `(seller)` Stack, so Expo Router never turns
 * them into a tab.
 *
 * The bar height and bottom padding are derived from the real safe-area
 * inset (the BUG-03 rule), so the labels sit above the Home Indicator on
 * an iPhone and the bar does not grow an empty strip on Android.
 *
 * Access control is applied once, by the parent `(seller)` layout.
 */

import { Tabs } from 'expo-router';
import { BarChart3, CalendarDays, Megaphone, User, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontFamily, fontSize } from '@/constants/theme';

/** The tab opened when the group is entered without a child path. */
export const unstable_settings = {
  initialRouteName: 'tong-quan',
};

/** Height of the bar itself: icon (21) + label (≈12) + the vertical padding. */
const CONTENT_HEIGHT = 56;

/** Extra space between the labels and the Home Indicator. */
const BOTTOM_GAP = 4;

export default function SellerTabsLayout() {
  const insets = useSafeAreaInsets();
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
        name="tong-quan"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => <BarChart3 size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="tin-dang"
        options={{
          title: 'Tin đăng',
          tabBarIcon: ({ color }) => <Megaphone size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="lich-hen-xem"
        options={{
          title: 'Lịch hẹn',
          tabBarIcon: ({ color }) => <CalendarDays size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="khach-hang"
        options={{
          title: 'Khách hàng',
          tabBarIcon: ({ color }) => <Users size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="tai-khoan-chu-tro"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <User size={21} color={color} strokeWidth={2.4} />,
        }}
      />
    </Tabs>
  );
}
