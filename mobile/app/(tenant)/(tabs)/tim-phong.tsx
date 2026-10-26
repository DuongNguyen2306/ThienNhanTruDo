/**
 * SCENE 009 — Search & filter.
 *
 * The list screen of the tenant. Layout, top to bottom:
 *
 *   1. the search bar (a text query plus a "bộ lọc" button)
 *   2. the active filter chips
 *   3. the result count
 *   4. the list of rooms
 *
 * The filters are the ones the backend understands: room type, price
 * range, area range, "đã xác minh", "trống ngay", "nội thất" and "cho
 * nuôi thú cưng". The text query is matched against the ward and the
 * district, exactly the way the website does it.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Filter, Home, Search, SlidersHorizontal, X } from 'lucide-react-native';

import { AppButton, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { FilterChip, ListingCard } from '@/components/tenant';
import { listingsApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { formatNumber } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing, ListingSearchParams } from '@/types/listing';

/** The room detail screen (SCENE 011). */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The map search screen (SCENE 010). */
const MAP_ROUTE = '/(tenant)/ban-do';

/** The room types the backend accepts. */
const ROOM_TYPES = [
  { key: 'phong-tro', label: 'Phòng trọ' },
  { key: 'chung-cu-mini', label: 'Chung cư mini' },
  { key: 'nha-tro', label: 'Nhà trọ' },
  { key: 'can-ho', label: 'Căn hộ' },
] as const;

/** The price brackets offered by the filter sheet. */
const PRICE_BANDS = [
  { key: '0-3000000', label: 'Dưới 3 triệu', min: undefined, max: 3000000 },
  { key: '3000000-5000000', label: '3 – 5 triệu', min: 3000000, max: 5000000 },
  { key: '5000000-8000000', label: '5 – 8 triệu', min: 5000000, max: 8000000 },
  { key: '8000000-', label: 'Trên 8 triệu', min: 8000000, max: undefined },
] as const;

interface Filters {
  roomType?: string;
  priceBand?: string;
  district?: string;
  verified?: boolean;
  vacantNow?: boolean;
  furniture?: boolean;
  pets?: boolean;
}

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ roomType?: string }>();

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>(() =>
    typeof params.roomType === 'string' ? { roomType: params.roomType } : {},
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * The text query is matched against the ward and the district — the two
   * fields the backend filters on with a "contains" clause.
   */
  const searchParams = useMemo<ListingSearchParams>(() => {
    const band = PRICE_BANDS.find((item) => item.key === filters.priceBand);
    const trimmed = query.trim();

    return {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...(filters.roomType ? { roomType: filters.roomType } : {}),
      ...(band?.min !== undefined ? { minRent: band.min } : {}),
      ...(band?.max !== undefined ? { maxRent: band.max } : {}),
      ...(trimmed ? { ward: trimmed } : {}),
      ...(filters.verified !== undefined ? { verified: filters.verified } : {}),
      ...(filters.vacantNow !== undefined ? { vacantNow: filters.vacantNow } : {}),
      ...(filters.furniture !== undefined ? { furniture: filters.furniture } : {}),
      ...(filters.pets !== undefined ? { pets: filters.pets } : {}),
    };
  }, [filters, query]);

  const fetcher = useCallback(() => listingsApi.search(searchParams), [searchParams]);
  const { data, isLoading, error, reload } = useAsyncData<Awaited<ReturnType<typeof listingsApi.search>>>(
    fetcher,
    [searchParams],
  );

  const listings = useMemo(() => data?.listings ?? [], [data]);
  const pagination = data?.pagination;

  const openDetail = useCallback(
    (id: string) => {
      router.push({ pathname: DETAIL_ROUTE, params: { id } } as never);
    },
    [router],
  );

  const openMap = useCallback(() => {
    router.push(MAP_ROUTE as never);
  }, [router]);

  const toggle = useCallback((key: keyof Filters) => {
    setFilters((current) => ({ ...current, [key]: current[key] ? undefined : true }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({});
    setQuery('');
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];

    if (filters.roomType) {
      const roomType = ROOM_TYPES.find((item) => item.key === filters.roomType);
      chips.push({
        key: 'roomType',
        label: roomType?.label ?? filters.roomType,
        onRemove: () => setFilters((c) => ({ ...c, roomType: undefined })),
      });
    }
    if (filters.priceBand) {
      const band = PRICE_BANDS.find((item) => item.key === filters.priceBand);
      chips.push({
        key: 'priceBand',
        label: band?.label ?? filters.priceBand,
        onRemove: () => setFilters((c) => ({ ...c, priceBand: undefined })),
      });
    }
    if (filters.verified) {
      chips.push({
        key: 'verified',
        label: 'Đã xác minh',
        onRemove: () => setFilters((c) => ({ ...c, verified: undefined })),
      });
    }
    if (filters.vacantNow) {
      chips.push({
        key: 'vacantNow',
        label: 'Trống ngay',
        onRemove: () => setFilters((c) => ({ ...c, vacantNow: undefined })),
      });
    }
    if (filters.furniture) {
      chips.push({
        key: 'furniture',
        label: 'Nội thất',
        onRemove: () => setFilters((c) => ({ ...c, furniture: undefined })),
      });
    }
    if (filters.pets) {
      chips.push({
        key: 'pets',
        label: 'Cho nuôi pet',
        onRemove: () => setFilters((c) => ({ ...c, pets: undefined })),
      });
    }
    if (query.trim()) {
      chips.push({
        key: 'query',
        label: query.trim(),
        onRemove: () => setQuery(''),
      });
    }

    return chips;
  }, [filters, query]);

  return (
    <View style={styles.flex}>
      {/* --- Search bar ------------------------------------------------ */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.searchRow}>
          <View style={styles.searchField}>
            <Search size={18} color={colors.textMuted} strokeWidth={2.6} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Tìm theo phường, quận…"
              placeholderTextColor={colors.textSubtle}
              style={[styles.searchInput, { fontFamily: fontFamily.regular }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
            {query ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Xoá từ khoá"
                hitSlop={8}
              >
                <X size={16} color={colors.textMuted} strokeWidth={2.8} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setSheetOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Bộ lọc"
            style={({ pressed }) => [
              styles.filterButton,
              activeChips.length > 0 ? styles.filterButtonActive : null,
              pressed && styles.filterButtonPressed,
            ]}
          >
            <Filter size={18} color={colors.ink} strokeWidth={2.8} />
          </Pressable>
        </View>

        {/* --- Active chips --------------------------------------------- */}
        {activeChips.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {activeChips.map((chip) => (
              <Pressable
                key={chip.key}
                onPress={chip.onRemove}
                accessibilityRole="button"
                accessibilityLabel={`Bỏ lọc ${chip.label}`}
                style={({ pressed }) => [styles.activeChip, pressed && styles.activeChipPressed]}
              >
                <Text style={[styles.activeChipText, { fontFamily: fontFamily.semibold }]}>
                  {chip.label}
                </Text>
                <X size={12} color={colors.ink} strokeWidth={3} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* --- Filter sheet ----------------------------------------------- */}
      {sheetOpen ? (
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { fontFamily: fontFamily.extrabold }]}>BỘ LỌC</Text>
            <Pressable
              onPress={clearAll}
              accessibilityRole="button"
              accessibilityLabel="Xoá tất cả bộ lọc"
              hitSlop={8}
            >
              <Text style={[styles.sheetClear, { fontFamily: fontFamily.bold }]}>Xoá tất cả</Text>
            </Pressable>
          </View>

          <Text style={[styles.filterLabel, { fontFamily: fontFamily.semibold }]}>Loại phòng</Text>
          <View style={styles.filterWrap}>
            {ROOM_TYPES.map((item) => (
              <FilterChip
                key={item.key}
                label={item.label}
                selected={filters.roomType === item.key}
                onPress={() =>
                  setFilters((current) => ({
                    ...current,
                    roomType: current.roomType === item.key ? undefined : item.key,
                  }))
                }
              />
            ))}
          </View>

          <Text style={[styles.filterLabel, { fontFamily: fontFamily.semibold }]}>Giá thuê</Text>
          <View style={styles.filterWrap}>
            {PRICE_BANDS.map((band) => (
              <FilterChip
                key={band.key}
                label={band.label}
                selected={filters.priceBand === band.key}
                onPress={() =>
                  setFilters((current) => ({
                    ...current,
                    priceBand: current.priceBand === band.key ? undefined : band.key,
                  }))
                }
              />
            ))}
          </View>

          <Text style={[styles.filterLabel, { fontFamily: fontFamily.semibold }]}>Tiện ích</Text>
          <View style={styles.filterWrap}>
            <FilterChip
              label="Đã xác minh"
              selected={filters.verified === true}
              onPress={() => toggle('verified')}
              withDot
            />
            <FilterChip
              label="Trống ngay"
              selected={filters.vacantNow === true}
              onPress={() => toggle('vacantNow')}
              withDot
            />
            <FilterChip
              label="Nội thất có sẵn"
              selected={filters.furniture === true}
              onPress={() => toggle('furniture')}
              withDot
            />
            <FilterChip
              label="Cho nuôi thú cưng"
              selected={filters.pets === true}
              onPress={() => toggle('pets')}
              withDot
            />
          </View>

          <AppButton
            label="Xem kết quả"
            onPress={() => setSheetOpen(false)}
            style={styles.sheetButton}
            showAccentMark
          />
        </View>
      ) : null}

      {/* --- Results ---------------------------------------------------- */}
      <View style={styles.resultBar}>
        <Text style={[styles.resultText, { fontFamily: fontFamily.medium }]}>
          {pagination ? `${formatNumber(pagination.total)} phòng` : 'Đang tải…'}
        </Text>

        <Pressable
          onPress={openMap}
          accessibilityRole="button"
          accessibilityLabel="Xem trên bản đồ"
          style={({ pressed }) => [styles.mapButton, pressed && styles.mapButtonPressed]}
        >
          <SlidersHorizontal size={14} color={colors.ink} strokeWidth={2.8} />
          <Text style={[styles.mapButtonText, { fontFamily: fontFamily.bold }]}>Bản đồ</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState message="Đang tìm phòng…" />
      ) : error ? (
        <ErrorState title="Không tải được kết quả" message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Không tìm thấy phòng phù hợp"
              description="Thử bỏ bớt bộ lọc hoặc tìm với khu vực khác."
              icon={Home}
              actionLabel="Xoá bộ lọc"
              onAction={clearAll}
            />
          }
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => openDetail(item.id)} style={styles.listItem} />
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

  topBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: borderWidth.md,
    borderBottomColor: colors.ink,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonPressed: {
    opacity: 0.75,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },

  chipRow: {
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingRight: spacing.lg,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  activeChipPressed: {
    opacity: 0.7,
  },
  activeChipText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },

  sheet: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  sheetClear: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  filterLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sheetButton: {
    marginTop: spacing.lg,
  },

  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  resultText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  mapButtonPressed: {
    opacity: 0.75,
  },
  mapButtonText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  listItem: {
    marginBottom: spacing.xs,
  },
});
