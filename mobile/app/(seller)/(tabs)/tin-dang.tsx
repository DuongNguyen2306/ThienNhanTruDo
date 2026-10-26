/**
 * SCENE 021 — My Listings (Tin đăng của tôi).
 *
 * `GET /api/seller/listings` returns ONLY the signed-in seller's rows — the
 * backend filters on `sellerId: req.user.id` from the JWT, so no seller id
 * is ever sent from the client.
 *
 * Deleting calls `DELETE /api/seller/listings/:id` behind a confirmation
 * dialog. The row is removed from the list only after the backend answers
 * successfully; a failure puts it back and shows the server's message.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Megaphone, Plus } from 'lucide-react-native';

import { AppButton, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { SellerListingCard } from '@/components/seller';
import { FilterChip } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { sellerApi } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { LISTING_STATUS_OPTIONS } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, spacing } from '@/constants/theme';
import type { SellerListing } from '@/types/seller';

const CREATE_LISTING_ROUTE = '/(seller)/dang-tin';

type FilterKey = (typeof LISTING_STATUS_OPTIONS)[number]['key'];

export default function SellerListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    // The backend filters by status; "all" sends no parameter.
    const response = await sellerApi.listings(filter === 'all' ? undefined : filter);
    return response.listings;
  }, [filter]);

  const { data, isLoading, error, reload, setData } = useAsyncData<SellerListing[]>(fetcher, [filter]);

  const listings = useMemo(() => data ?? [], [data]);

  // Coming back from the create/edit screen should show the fresh state.
  // The first focus is skipped: `useAsyncData` already loads on mount.
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const openCreate = useCallback(() => {
    router.push(CREATE_LISTING_ROUTE as never);
  }, [router]);

  const openEdit = useCallback(
    (id: string) => {
      router.push({ pathname: '/(seller)/sua-tin/[id]', params: { id } } as never);
    },
    [router],
  );

  const confirmDelete = useCallback(
    (listing: SellerListing) => {
      if (deletingId) return;

      Alert.alert(
        'Xóa tin đăng',
        `Bạn có chắc muốn xóa "${listing.title}"? Thao tác này không thể hoàn tác.`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              setDeletingId(listing.id);
              setActionError(null);
              try {
                await sellerApi.deleteListing(listing.id);
                // Removed from the list only after the backend confirmed.
                setData((current) => (current ?? []).filter((item) => item.id !== listing.id));
              } catch (caught) {
                setActionError(
                  caught instanceof Error
                    ? caught.message
                    : 'Không xóa được tin đăng. Vui lòng thử lại.',
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    },
    [deletingId, setData],
  );

  return (
    <View style={styles.flex}>
      {/* --- Header --------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>TIN ĐĂNG</Text>
            <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
              {isLoading ? 'Đang tải…' : `${formatNumber(listings.length)} tin đăng`}
            </Text>
          </View>

          <AppButton
            label="Đăng tin"
            size="sm"
            onPress={openCreate}
            trailingIcon={<Plus size={14} color={colors.ink} strokeWidth={3} />}
          />
        </View>

        {/* --- Status filter ------------------------------------------ */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {LISTING_STATUS_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={filter === option.key}
              onPress={() => setFilter(option.key)}
            />
          ))}
        </ScrollView>
      </View>

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{actionError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState message="Đang tải tin đăng…" />
      ) : error ? (
        <ErrorState title="Không tải được tin đăng" message={error} onRetry={reload} />
      ) : listings.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Chưa có tin đăng nào' : 'Không có tin ở trạng thái này'}
          description={
            filter === 'all'
              ? 'Đăng tin đầu tiên để tiếp cận người thuê trên Thiên Nhãn Trú Đồ.'
              : 'Hãy chọn một trạng thái khác để xem các tin còn lại.'
          }
          icon={Megaphone}
          actionLabel={filter === 'all' ? 'Đăng tin ngay' : undefined}
          onAction={filter === 'all' ? openCreate : undefined}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {listings.map((listing) => (
            <SellerListingCard
              key={listing.id}
              listing={listing}
              deleting={deletingId === listing.id}
              onEdit={() => openEdit(listing.id)}
              onDelete={() => confirmDelete(listing)}
            />
          ))}

          <AppButton label="Đăng tin mới" variant="secondary" fullWidth onPress={openCreate} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: borderWidth.lg,
    borderBottomColor: colors.ink,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.ink,
    opacity: 0.65,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingRight: spacing.lg,
  },
  errorBanner: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
