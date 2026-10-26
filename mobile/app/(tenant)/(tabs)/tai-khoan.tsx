/**
 * SCENE 017 — Tenant profile.
 *
 * The account screen of a signed-in tenant. It shows:
 *
 *   1. the identity card (avatar, name, phone, e-mail)
 *   2. the three counters (appointments, saved rooms, reviews)
 *   3. the menu: edit profile, saved rooms, appointments, become a
 *      landlord
 *   4. the sign-out button
 *
 * The data comes from `GET /api/tenant/profile` and the session itself.
 */

import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bookmark,
  CalendarDays,
  ChevronRight,
  FileEdit,
  LogOut,
  Store,
} from 'lucide-react-native';

import { AppButton, ErrorState, LoadingState } from '@/components/ui';
import { tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { useAuth } from '@/providers/auth-provider';
import { formatDate } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { TenantProfile, TenantStats } from '@/types/listing';

/** The edit-profile screen (SCENE 018). */
const EDIT_PROFILE_ROUTE = '/(tenant)/sua-ho-so';

/** The landlord application screen (SCENE 019). */
const APPLY_SELLER_ROUTE = '/(tenant)/dang-ky-chu-tro';

/** The saved-rooms screen (SCENE 015). */
const SAVED_ROUTE = '/(tenant)/(tabs)/da-luu';

/** The appointment list (SCENE 016). */
const APPOINTMENTS_ROUTE = '/(tenant)/(tabs)/lich-hen';

export default function TenantProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const fetcher = useCallback(() => tenantApi.profile(), []);
  const { data, isLoading, error, reload } = useAsyncData<{
    user: TenantProfile;
    stats: TenantStats;
  }>(fetcher, []);

  const profile = data?.user ?? null;
  const stats = data?.stats;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/dang-nhap' as never);
  }, [router, signOut]);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang tải hồ sơ…" />;
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <ErrorState title="Không tải được hồ sơ" message={error} onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
      }
    >
      {/* --- Identity card --------------------------------------------- */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
            {profile?.initials ?? user?.initials ?? '??'}
          </Text>
        </View>

        <Text style={[styles.name, { fontFamily: fontFamily.extrabold }]}>
          {profile?.fullName ?? user?.fullName ?? 'Người thuê'}
        </Text>
        <Text style={[styles.role, { fontFamily: fontFamily.medium }]}>Người thuê</Text>

        <View style={styles.identityMeta}>
          <Text style={[styles.identityLine, { fontFamily: fontFamily.regular }]}>
            {profile?.phone ?? user?.phone ?? '—'}
          </Text>
          {profile?.email || user?.email ? (
            <Text style={[styles.identityLine, { fontFamily: fontFamily.regular }]}>
              {profile?.email ?? user?.email}
            </Text>
          ) : null}
          {profile?.createdAt ? (
            <Text style={[styles.identityHint, { fontFamily: fontFamily.regular }]}>
              Thành viên từ {formatDate(profile.createdAt)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* --- Counters --------------------------------------------------- */}
      {stats ? (
        <View style={styles.statsRow}>
          <StatBox value={stats.appointments} label="Lịch hẹn" />
          <StatBox value={stats.savedListings} label="Đã lưu" />
          <StatBox value={stats.reviews} label="Đánh giá" />
        </View>
      ) : null}

      {/* --- Menu ------------------------------------------------------- */}
      <View style={styles.menu}>
        <MenuRow
          icon={FileEdit}
          label="Sửa hồ sơ"
          onPress={() => router.push(EDIT_PROFILE_ROUTE as never)}
        />
        <MenuRow
          icon={Bookmark}
          label="Phòng đã lưu"
          onPress={() => router.navigate(SAVED_ROUTE as never)}
        />
        <MenuRow
          icon={CalendarDays}
          label="Lịch hẹn xem"
          onPress={() => router.navigate(APPOINTMENTS_ROUTE as never)}
        />
        <MenuRow
          icon={Store}
          label="Đăng ký làm chủ trọ"
          onPress={() => router.push(APPLY_SELLER_ROUTE as never)}
        />
      </View>

      {/* --- Sign out ---------------------------------------------------- */}
      <AppButton
        label="Đăng xuất"
        variant="danger"
        fullWidth
        onPress={handleSignOut}
        showAccentMark
        style={styles.signOut}
      />

      <Text style={[styles.footer, { fontFamily: fontFamily.regular }]}>
        THIÊN NHÃN TRÚ ĐỒ · Ứng dụng di động
      </Text>
    </ScrollView>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { fontFamily: fontFamily.extrabold }]}>{value}</Text>
      <Text style={[styles.statLabel, { fontFamily: fontFamily.medium }]}>{label}</Text>
    </View>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof FileEdit;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
    >
      <View style={styles.menuIcon}>
        <Icon size={18} color={colors.ink} strokeWidth={2.6} />
      </View>
      <Text style={[styles.menuLabel, { fontFamily: fontFamily.semibold }]}>{label}</Text>
      <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
  },

  identityCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: borderWidth.lg,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.md,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: borderWidth.lg,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    color: colors.ink,
  },
  name: {
    marginTop: spacing.md,
    fontSize: fontSize.xl,
    color: colors.ink,
    textAlign: 'center',
  },
  role: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  identityMeta: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  identityLine: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  identityHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  statValue: {
    fontSize: fontSize.xl,
    color: colors.ink,
  },
  statLabel: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  menu: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  menuRowPressed: {
    backgroundColor: colors.background,
  },
  menuIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  menuLabel: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
  },

  signOut: {
    marginTop: spacing.xl,
  },
  footer: {
    marginTop: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
