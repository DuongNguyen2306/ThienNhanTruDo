/**
 * SCENE 020 — Seller Dashboard (Tổng quan).
 *
 * Every number on this screen comes from `GET /api/seller/dashboard`:
 *
 *   listings.draft / pending / active / rejected / inactive
 *   newLeads · pendingAppointments · totalViews
 *
 * The endpoint returns counters only — no activity feed — so the screen
 * shows the recent listings from `GET /api/seller/listings` as the
 * "hoạt động gần đây" block. No number is hardcoded and no chart is drawn
 * from invented data.
 */

import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarClock,
  Eye,
  Megaphone,
  MessageSquare,
  Plus,
  Wallet,
} from 'lucide-react-native';

import { AppButton, AppCard, EmptyState, ErrorState, LoadingState, StatusBadge, type StatusBadgeVariant } from '@/components/ui';
import { SellerListingCard, SellerStatCard } from '@/components/seller';
import { SectionTitle } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { sellerApi } from '@/lib/api-client';
import { formatNumber, formatRelative } from '@/lib/format';
import { listingStatusLabel, listingStatusVariant } from '@/lib/seller-format';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerDashboardStats, SellerListing } from '@/types/seller';

const CREATE_LISTING_ROUTE = '/(seller)/dang-tin';
const LISTINGS_ROUTE = '/(seller)/(tabs)/tin-dang';
const APPOINTMENTS_ROUTE = '/(seller)/(tabs)/lich-hen-xem';
const LEADS_ROUTE = '/(seller)/(tabs)/khach-hang';

interface DashboardPayload {
  stats: SellerDashboardStats;
  listings: SellerListing[];
}

export default function SellerDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const fetcher = useCallback(async (): Promise<DashboardPayload> => {
    const [dashboard, listingsResponse] = await Promise.all([
      sellerApi.dashboard(),
      sellerApi.listings(),
    ]);
    return { stats: dashboard.stats, listings: listingsResponse.listings };
  }, []);

  const { data, isLoading, error, reload } = useAsyncData<DashboardPayload>(fetcher, []);

  const stats = data?.stats;
  const listings = useMemo(() => data?.listings ?? [], [data]);
  const recentListings = useMemo(() => listings.slice(0, 3), [listings]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Chào buổi sáng';
    if (hour < 14) return 'Chào buổi trưa';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }, []);

  const totalListings = useMemo(() => {
    if (!stats) return 0;
    const { draft, pending, active, rejected, inactive } = stats.listings;
    return draft + pending + active + rejected + inactive;
  }, [stats]);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
      }
    >
      {/* --- Header ------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { fontFamily: fontFamily.medium }]}>{greeting},</Text>
          <Text numberOfLines={1} style={[styles.name, { fontFamily: fontFamily.extrabold }]}>
            {user?.fullName ?? 'Chủ cho thuê'}
          </Text>
          <Text style={[styles.headerHint, { fontFamily: fontFamily.regular }]}>
            Thiên Nhãn Trú Đồ · Kênh chủ trọ
          </Text>
        </View>

        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
            {user?.initials ?? '??'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingState message="Đang tải tổng quan…" />
      ) : error ? (
        <ErrorState title="Không tải được tổng quan" message={error} onRetry={reload} />
      ) : (
        <>
          {/* --- Counters --------------------------------------------- */}
          <View style={styles.statsRow}>
            <SellerStatCard
              label="Tin đang hiển thị"
              value={formatNumber(stats?.listings.active ?? 0)}
              icon={Megaphone}
              accent
              hint={`Tổng ${formatNumber(totalListings)} tin`}
              onPress={() => router.navigate(LISTINGS_ROUTE as never)}
            />
            <SellerStatCard
              label="Lượt xem"
              value={formatNumber(stats?.totalViews ?? 0)}
              icon={Eye}
              hint="Tất cả tin"
            />
          </View>

          <View style={[styles.statsRow, styles.statsRowSpacing]}>
            <SellerStatCard
              label="Lịch hẹn chờ"
              value={formatNumber(stats?.pendingAppointments ?? 0)}
              icon={CalendarClock}
              onPress={() => router.navigate(APPOINTMENTS_ROUTE as never)}
            />
            <SellerStatCard
              label="Khách mới"
              value={formatNumber(stats?.newLeads ?? 0)}
              icon={MessageSquare}
              onPress={() => router.navigate(LEADS_ROUTE as never)}
            />
          </View>

          {/* --- Status breakdown ------------------------------------- */}
          <AppCard style={styles.section}>
            <SectionTitle title="Trạng thái tin đăng" />

            <StatusRow
              label={listingStatusLabel('active')}
              value={stats?.listings.active ?? 0}
              variant={listingStatusVariant('active')}
            />
            <StatusRow
              label={listingStatusLabel('pending')}
              value={stats?.listings.pending ?? 0}
              variant={listingStatusVariant('pending')}
            />
            <StatusRow
              label={listingStatusLabel('rejected')}
              value={stats?.listings.rejected ?? 0}
              variant={listingStatusVariant('rejected')}
            />
            <StatusRow
              label={listingStatusLabel('inactive')}
              value={stats?.listings.inactive ?? 0}
              variant={listingStatusVariant('inactive')}
            />

            {totalListings === 0 ? (
              <Text style={[styles.emptyHint, { fontFamily: fontFamily.regular }]}>
                Bạn chưa có tin đăng nào.
              </Text>
            ) : null}
          </AppCard>

          {/* --- Shortcuts -------------------------------------------- */}
          <View style={styles.section}>
            <SectionTitle title="Quản lý nhanh" />

            <View style={styles.shortcutRow}>
              <AppButton
                label="Đăng tin mới"
                size="sm"
                showAccentMark
                style={styles.shortcut}
                onPress={() => router.push(CREATE_LISTING_ROUTE as never)}
                trailingIcon={<Plus size={15} color={colors.ink} strokeWidth={3} />}
              />
              <AppButton
                label="Quản lý tin"
                size="sm"
                variant="secondary"
                style={styles.shortcut}
                onPress={() => router.navigate(LISTINGS_ROUTE as never)}
              />
            </View>
          </View>

          {/* --- Recent listings -------------------------------------- */}
          <View style={styles.section}>
            <SectionTitle
              title="Tin gần đây"
              actionLabel={listings.length > 3 ? 'Xem tất cả' : undefined}
              onAction={
                listings.length > 3
                  ? () => router.navigate(LISTINGS_ROUTE as never)
                  : undefined
              }
            />

            {recentListings.length === 0 ? (
              <AppCard flat style={styles.emptyCard}>
                <EmptyState
                  title="Chưa có tin đăng"
                  description="Đăng tin đầu tiên để bắt đầu nhận khách thuê."
                  icon={Wallet}
                  actionLabel="Đăng tin ngay"
                  onAction={() => router.push(CREATE_LISTING_ROUTE as never)}
                />
              </AppCard>
            ) : (
              <View style={styles.list}>
                {recentListings.map((listing) => (
                  <SellerListingCard
                    key={listing.id}
                    listing={listing}
                    onEdit={() =>
                      router.push({
                        pathname: '/(seller)/sua-tin/[id]',
                        params: { id: listing.id },
                      } as never)
                    }
                  />
                ))}
              </View>
            )}
          </View>

          {data?.listings && data.listings.length > 0 ? (
            <Text style={[styles.footerHint, { fontFamily: fontFamily.regular }]}>
              Cập nhật gần nhất:{' '}
              {formatRelative(
                data.listings.reduce<string | undefined>((latest, item) => {
                  if (!item.createdAt) return latest;
                  if (!latest) return item.createdAt;
                  return new Date(item.createdAt) > new Date(latest) ? item.createdAt : latest;
                }, undefined),
              )}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function StatusRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: StatusBadgeVariant;
}) {
  return (
    <View style={styles.statusRow}>
      <StatusBadge label={label} variant={variant} withDot />
      <Text style={[styles.statusValue, { fontFamily: fontFamily.extrabold }]}>
        {formatNumber(value)}
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
    paddingBottom: spacing.huge,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary,
    borderBottomWidth: borderWidth.lg,
    borderBottomColor: colors.ink,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.sm,
    color: colors.ink,
    opacity: 0.7,
  },
  name: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  headerHint: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.ink,
    opacity: 0.6,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  avatarText: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  statsRowSpacing: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  statusValue: {
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  emptyHint: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  shortcut: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
  },
  footerHint: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.xl,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
