/**
 * SCENE 008 — Tenant home.
 *
 * The landing screen of a signed-in tenant. Layout, top to bottom:
 *
 *   1. the greeting header with the avatar
 *   2. the quick search bar (tap it to go to SCENE 009)
 *   3. the room-type shortcuts
 *   4. the "Phòng nổi bật" row — the featured listings
 *   5. the "Lợi ích" trust strip
 *
 * All the data comes from the real backend: `GET /api/listings/featured`
 * for the highlighted rooms and `GET /api/tenant/profile` for the
 * counters.
 */

import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Building2,
  Home,
  Search,
  ShieldCheck,
  Wallet,
} from 'lucide-react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { ListingCard, SectionTitle } from '@/components/tenant';
import { listingsApi, tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing, TenantProfile, TenantStats } from '@/types/listing';

/** The search screen (SCENE 009). */
const SEARCH_ROUTE = '/(tenant)/(tabs)/tim-phong';

/** The room detail screen (SCENE 011). */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The room-type shortcuts and the query each one opens. */
const ROOM_SHORTCUTS = [
  { key: 'phong-tro', label: 'Phòng trọ', icon: Home },
  { key: 'chung-cu-mini', label: 'Chung cư mini', icon: Building2 },
  { key: 'nha-tro', label: 'Nhà trọ', icon: Home },
  { key: 'can-ho', label: 'Căn hộ', icon: Building2 },
] as const;

export default function TenantHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [refreshing, setRefreshing] = useState(false);

  const featuredFetcher = useCallback(() => listingsApi.featured(), []);
  const profileFetcher = useCallback(() => tenantApi.profile(), []);

  const featured = useAsyncData<{ listings: Listing[] }>(featuredFetcher, []);
  const profile = useAsyncData<{ user: TenantProfile; stats: TenantStats }>(profileFetcher, []);

  const openSearch = useCallback(
    (roomType?: string) => {
      // A tab destination is *navigated* to, not pushed, so the tabs group is
      // not stacked on top of itself.
      router.navigate({ pathname: SEARCH_ROUTE, params: roomType ? { roomType } : undefined } as never);
    },
    [router],
  );

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: DETAIL_ROUTE, params: { id } } as never);
    },
    [router],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    featured.reload();
    profile.reload();
    setRefreshing(false);
  }, [featured, profile]);

  const listings = featured.data?.listings ?? [];
  const stats = profile.data?.stats;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={colors.ink} />
      }
    >
      {/* --- Greeting ------------------------------------------------- */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <Text style={[styles.hello, { fontFamily: fontFamily.regular }]}>Xin chào,</Text>
          <Text numberOfLines={1} style={[styles.name, { fontFamily: fontFamily.extrabold }]}>
            {user?.fullName ?? 'Người thuê'}
          </Text>
        </View>

        <View style={styles.avatar}>
          <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
            {user?.initials ?? '??'}
          </Text>
        </View>
      </View>

      {/* --- Counters -------------------------------------------------- */}
      {stats ? (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { fontFamily: fontFamily.extrabold }]}>
              {stats.appointments}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: fontFamily.medium }]}>Lịch hẹn</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { fontFamily: fontFamily.extrabold }]}>
              {stats.savedListings}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: fontFamily.medium }]}>Đã lưu</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { fontFamily: fontFamily.extrabold }]}>{stats.reviews}</Text>
            <Text style={[styles.statLabel, { fontFamily: fontFamily.medium }]}>Đánh giá</Text>
          </View>
        </View>
      ) : null}

      {/* --- Search ---------------------------------------------------- */}
      <Pressable
        onPress={() => openSearch()}
        accessibilityRole="search"
        accessibilityLabel="Tìm phòng"
        style={({ pressed }) => [styles.searchBar, pressed && styles.searchBarPressed]}
      >
        <View style={styles.searchIconBox}>
          <Search size={18} color={colors.ink} strokeWidth={2.8} />
        </View>
        <Text style={[styles.searchPlaceholder, { fontFamily: fontFamily.regular }]}>
          Bạn muốn tìm phòng ở đâu?
        </Text>
      </Pressable>

      {/* --- Room type shortcuts --------------------------------------- */}
      <View style={styles.shortcutRow}>
        {ROOM_SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Pressable
              key={shortcut.key}
              onPress={() => openSearch(shortcut.key)}
              accessibilityRole="button"
              accessibilityLabel={shortcut.label}
              style={({ pressed }) => [styles.shortcut, pressed && styles.shortcutPressed]}
            >
              <View style={styles.shortcutIcon}>
                <Icon size={20} color={colors.ink} strokeWidth={2.6} />
              </View>
              <Text
                numberOfLines={2}
                style={[styles.shortcutLabel, { fontFamily: fontFamily.semibold }]}
              >
                {shortcut.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* --- Featured listings ----------------------------------------- */}
      <View style={styles.section}>
        <SectionTitle
          title="PHÒNG NỔI BẬT"
          subtitle="Những tin đăng được xem nhiều nhất"
          actionLabel="Xem tất cả"
          onAction={() => openSearch()}
        />

        {featured.isLoading ? (
          <LoadingState message="Đang tải phòng nổi bật…" />
        ) : featured.error ? (
          <ErrorState
            title="Không tải được danh sách"
            message={featured.error}
            onRetry={featured.reload}
          />
        ) : listings.length === 0 ? (
          <EmptyState
            title="Chưa có phòng nổi bật"
            description="Hiện chưa có tin đăng nào được đăng. Hãy quay lại sau."
            icon={Home}
            actionLabel="Tìm phòng"
            onAction={() => openSearch()}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRow}
          >
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPress={() => openDetail(listing.id)}
                style={styles.featuredCard}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* --- Trust strip ---------------------------------------------- */}
      <View style={styles.section}>
        <SectionTitle title="VÌ SAO CHỌN CHÚNG TÔI" />

        <View style={styles.trustCard}>
          <TrustRow
            icon={ShieldCheck}
            title="Giữ thuê rõ ràng"
            text="Hợp đồng và cọc được ghi rõ trước khi bạn đặt tiền."
          />
          <View style={styles.divider} />
          <TrustRow
            icon={BadgeCheck}
            title="Manager kiểm định"
            text="Tin đã xác minh đã đi qua bước kiểm tra thông tin."
          />
          <View style={styles.divider} />
          <TrustRow
            icon={Wallet}
            title="Thanh toán an toàn"
            text="Thanh toán qua VNPay, có hoàn tiền khi có sự cố."
          />
        </View>
      </View>

      <View style={styles.footerSpace} />
    </ScrollView>
  );
}

function TrustRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.trustRow}>
      <View style={styles.trustIcon}>
        <Icon size={18} color={colors.ink} strokeWidth={2.6} />
      </View>
      <View style={styles.trustText}>
        <Text style={[styles.trustTitle, { fontFamily: fontFamily.bold }]}>{title}</Text>
        <Text style={[styles.trustBody, { fontFamily: fontFamily.regular }]}>{text}</Text>
      </View>
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

  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    flex: 1,
  },
  hello: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  searchBarPressed: {
    opacity: 0.8,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  searchIconBox: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textSubtle,
  },

  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  shortcutPressed: {
    opacity: 0.75,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  shortcutLabel: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.ink,
    textAlign: 'center',
  },

  section: {
    marginTop: spacing.xxl,
  },
  featuredRow: {
    paddingRight: spacing.xl,
    gap: spacing.md,
  },
  featuredCard: {
    width: 240,
  },

  trustCard: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    ...shadow.sm,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  trustIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  trustText: {
    flex: 1,
  },
  trustTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  trustBody: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.borderMuted,
  },

  footerSpace: {
    height: spacing.xxl,
  },
});
