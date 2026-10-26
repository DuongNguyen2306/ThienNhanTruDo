/**
 * SCENE 027 — Seller Profile (Tài khoản chủ trọ).
 *
 * Two real sources are combined:
 *
 *   `GET /api/auth/me`      → the account (name, phone, e-mail, role)
 *   `GET /api/seller/profile` → the seller profile (brand, CCCD, address,
 *                               status, responseRate, trustScore)
 *
 * If the seller has no profile row yet the endpoint answers 404; that is
 * treated as "chưa có hồ sơ" rather than as an error, because a freshly
 * approved seller may legitimately not have one.
 *
 * Sign-out goes through the existing `AuthProvider`; the role is never
 * touched locally.
 */

import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronRight,
  FileEdit,
  Lock,
  LogOut,
  ShieldCheck,
  Store,
} from 'lucide-react-native';

import { AppButton, AppCard, StatusBadge, type StatusBadgeVariant } from '@/components/ui';
import { SellerMenuRow } from '@/components/seller';
import { useAsyncData } from '@/hooks/use-async-data';
import { ApiError, sellerApi } from '@/lib/api-client';
import { formatDate, formatNumber } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerProfile } from '@/types/seller';

const EDIT_PROFILE_ROUTE = '/(seller)/chinh-sua-ho-so';
const NOTIFICATIONS_ROUTE = '/(seller)/thong-bao';
const SECURITY_ROUTE = '/(seller)/bao-mat';
const PASSWORD_ROUTE = '/(seller)/doi-mat-khau';

/** Map the backend profile status onto a badge. */
function profileStatus(status: string | undefined): { label: string; variant: StatusBadgeVariant } {
  switch (status) {
    case 'active':
      return { label: 'Đã xác minh', variant: 'verified' };
    case 'pending':
      return { label: 'Đang chờ duyệt', variant: 'pending' };
    case 'rejected':
      return { label: 'Bị từ chối', variant: 'rejected' };
    case 'none':
      return { label: 'Chưa gửi hồ sơ', variant: 'neutral' };
    default:
      return { label: 'Chưa có hồ sơ', variant: 'neutral' };
  }
}

export default function SellerAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut, refresh } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const fetcher = useCallback(async (): Promise<SellerProfile | null> => {
    try {
      const response = await sellerApi.profile();
      return response.profile;
    } catch (caught) {
      // No profile row yet — not an error state.
      if (caught instanceof ApiError && caught.status === 404) return null;
      throw caught;
    }
  }, []);

  const { data: profile, isLoading, reload } = useAsyncData<SellerProfile | null>(fetcher, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    reload();
    await refresh();
    setRefreshing(false);
  }, [reload, refresh]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/(auth)/dang-nhap');
  }, [router, signOut]);

  const badge = useMemo(
    () => profileStatus(profile?.status ?? user?.sellerStatus),
    [profile?.status, user?.sellerStatus],
  );

  const displayName = profile?.user?.fullName ?? user?.fullName ?? 'Chủ cho thuê';
  const displayPhone = profile?.user?.phone ?? user?.phone ?? '—';
  const displayEmail = profile?.user?.email ?? user?.email ?? '';

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.ink} />
      }
    >
      {/* --- Identity ----------------------------------------------- */}
      <View style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
            {user?.initials ?? '??'}
          </Text>
        </View>

        <Text numberOfLines={2} style={[styles.name, { fontFamily: fontFamily.extrabold }]}>
          {displayName}
        </Text>
        <Text style={[styles.role, { fontFamily: fontFamily.medium }]}>Chủ cho thuê</Text>

        <StatusBadge label={badge.label} variant={badge.variant} withDot style={styles.badge} />

        <View style={styles.identityMeta}>
          <Text style={[styles.identityLine, { fontFamily: fontFamily.regular }]}>{displayPhone}</Text>
          {displayEmail ? (
            <Text style={[styles.identityLine, { fontFamily: fontFamily.regular }]}>
              {displayEmail}
            </Text>
          ) : null}
        </View>
      </View>

      {/* --- Seller numbers ----------------------------------------- */}
      <View style={styles.statsRow}>
        <StatBox
          value={
            isLoading ? '—' : `${formatNumber(Math.round(profile?.responseRate ?? 0))}%`
          }
          label="Tỷ lệ phản hồi"
        />
        <StatBox
          value={isLoading ? '—' : formatNumber(profile?.trustScore ?? 0)}
          label="Điểm tin cậy"
        />
        <StatBox
          value={
            profile?.submittedAt ? formatDate(profile.submittedAt) : '—'
          }
          label="Ngày gửi hồ sơ"
          small
        />
      </View>

      {/* --- Seller profile ----------------------------------------- */}
      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Store size={16} color={colors.ink} strokeWidth={2.6} />
          </View>
          <Text style={[styles.sectionTitle, { fontFamily: fontFamily.extrabold }]}>
            Hồ sơ chủ trọ
          </Text>
        </View>

        <ProfileRow label="Tên thương hiệu" value={profile?.brand || 'Chưa cập nhật'} />
        <ProfileRow label="CCCD" value={maskId(profile?.idNumber)} />
        <ProfileRow label="Địa chỉ thường trú" value={profile?.address || 'Chưa cập nhật'} />
        <ProfileRow
          label="Xét duyệt"
          value={profile?.reviewedAt ? formatDate(profile.reviewedAt) : 'Chưa xét duyệt'}
        />
        {profile?.reviewNote ? (
          <ProfileRow label="Ghi chú duyệt" value={profile.reviewNote} />
        ) : null}

        {!profile ? (
          <Text style={[styles.hint, { fontFamily: fontFamily.regular }]}>
            Hồ sơ chủ trọ chưa được tạo. Cập nhật hồ sơ để ban quản lý xét duyệt.
          </Text>
        ) : null}

        <AppButton
          label="Chỉnh sửa hồ sơ"
          variant="secondary"
          size="sm"
          fullWidth
          style={styles.cardAction}
          onPress={() => router.push(EDIT_PROFILE_ROUTE as never)}
          trailingIcon={<ChevronRight size={15} color={colors.ink} strokeWidth={2.8} />}
        />
      </AppCard>

      {/* --- Menu --------------------------------------------------- */}
      <View style={styles.menu}>
        <SellerMenuRow
          icon={FileEdit}
          label="Chỉnh sửa hồ sơ"
          onPress={() => router.push(EDIT_PROFILE_ROUTE as never)}
        />
        <SellerMenuRow
          icon={Bell}
          label="Thông báo"
          onPress={() => router.push(NOTIFICATIONS_ROUTE as never)}
        />
        <SellerMenuRow
          icon={ShieldCheck}
          label="Bảo mật"
          onPress={() => router.push(SECURITY_ROUTE as never)}
        />
        <SellerMenuRow
          icon={Lock}
          label="Đổi mật khẩu"
          onPress={() => router.push(PASSWORD_ROUTE as never)}
        />
        <SellerMenuRow icon={LogOut} label="Đăng xuất" danger onPress={handleSignOut} />
      </View>

      <AppButton
        label="Đăng xuất"
        variant="danger"
        fullWidth
        showAccentMark
        style={styles.signOut}
        onPress={handleSignOut}
      />

      <Text style={[styles.footer, { fontFamily: fontFamily.regular }]}>
        THIÊN NHÃN TRÚ ĐỒ · Kênh chủ trọ
      </Text>
    </ScrollView>
  );
}

/** Show only the last four digits of the citizen id. */
function maskId(idNumber: string | null | undefined): string {
  if (!idNumber) return 'Chưa cập nhật';
  const digits = idNumber.replace(/\s/g, '');
  if (digits.length <= 4) return digits;
  return `••••••••${digits.slice(-4)}`;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={[styles.profileLabel, { fontFamily: fontFamily.medium }]}>{label}</Text>
      <Text style={[styles.profileValue, { fontFamily: fontFamily.semibold }]}>{value}</Text>
    </View>
  );
}

function StatBox({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <View style={styles.statBox}>
      <Text
        numberOfLines={1}
        style={[styles.statValue, { fontFamily: fontFamily.extrabold, fontSize: small ? fontSize.sm : fontSize.lg }]}
      >
        {value}
      </Text>
      <Text numberOfLines={2} style={[styles.statLabel, { fontFamily: fontFamily.medium }]}>
        {label}
      </Text>
    </View>
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
  badge: {
    marginTop: spacing.md,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  statValue: {
    color: colors.ink,
  },
  statLabel: {
    marginTop: 3,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  profileLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  profileValue: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'right',
  },
  hint: {
    marginTop: spacing.md,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  cardAction: {
    marginTop: spacing.lg,
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
