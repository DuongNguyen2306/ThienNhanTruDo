/**
 * SCENE 015 — Saved rooms.
 *
 * The list of the rooms the tenant saved, from `GET /api/tenant/saved`.
 * The heart on every card removes the room from the list, and the change
 * is applied to the local state right away.
 */

import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark } from 'lucide-react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { ListingCard } from '@/components/tenant';
import { tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { borderWidth, colors, fontFamily, fontSize, spacing } from '@/constants/theme';
import type { Listing, SavedListingsResponse } from '@/types/listing';

/** The room detail screen (SCENE 011). */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The search screen (SCENE 009). */
const SEARCH_ROUTE = '/(tenant)/(tabs)/tim-phong';

export default function SavedRoomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetcher = useCallback(() => tenantApi.saved(), []);
  const { data, isLoading, error, reload, setData } = useAsyncData<SavedListingsResponse>(fetcher, []);

  const listings = useMemo(() => data?.listings ?? [], [data]);

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: DETAIL_ROUTE, params: { id } } as never);
    },
    [router],
  );

  /**
   * Remove a room from the saved list.
   *
   * The room disappears immediately; if the backend refuses, it is put
   * back so the list never lies about the server state.
   */
  const remove = useCallback(
    async (listingId: string) => {
      if (busyId) return;

      setBusyId(listingId);
      const snapshot = data?.listings ?? [];

      setData((current) => ({
        listings: (current?.listings ?? []).filter((listing) => listing.id !== listingId),
      }));

      try {
        await tenantApi.unsaveListing(listingId);
      } catch {
        setData({ listings: snapshot });
      } finally {
        setBusyId(null);
      }
    },
    [busyId, data, setData],
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>PHÒNG ĐÃ LƯU</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          {listings.length > 0
            ? `${listings.length} phòng đang được theo dõi`
            : 'Danh sách phòng bạn đã lưu'}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState message="Đang tải phòng đã lưu…" />
      ) : error ? (
        <ErrorState title="Không tải được danh sách" message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Chưa lưu phòng nào"
              description="Bấm biểu tượng trái tim trên một tin đăng để lưu lại và xem sau."
              icon={Bookmark}
              actionLabel="Tìm phòng"
              onAction={() => router.navigate(SEARCH_ROUTE as never)}
            />
          }
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              saved
              onPress={() => openDetail(item.id)}
              onToggleSave={() => {
                void remove(item.id);
              }}
              style={styles.listItem}
            />
          )}
        />
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: borderWidth.md,
    borderBottomColor: colors.ink,
    backgroundColor: colors.primary,
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
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  listItem: {
    marginBottom: spacing.xs,
  },
});
