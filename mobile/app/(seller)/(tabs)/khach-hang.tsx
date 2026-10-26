/**
 * SCENE 025 — Seller Leads (Khách hàng quan tâm).
 *
 * `GET /api/seller/leads` is scoped to `sellerId: req.user.id` by the
 * backend and includes only the listing title. A lead carries the name and
 * phone the customer left on the listing form — nothing more, because the
 * backend has nothing more.
 *
 * The status filter and the search box work on the already-loaded rows;
 * the endpoint has no filter parameters, so inventing a query would be a
 * lie about the contract.
 */

import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Users } from 'lucide-react-native';

import { AppInput, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { LeadCard } from '@/components/seller';
import { FilterChip } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { sellerApi } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { LEAD_STATUS_OPTIONS } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, spacing } from '@/constants/theme';
import type { SellerLead } from '@/types/seller';

const FILTERS = [{ key: 'all', label: 'Tất cả' }, ...LEAD_STATUS_OPTIONS] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function SellerLeadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetcher = useCallback(async () => {
    const response = await sellerApi.leads();
    return response.leads;
  }, []);

  const { data, isLoading, error, reload } = useAsyncData<SellerLead[]>(fetcher, []);

  const leads = useMemo(() => data ?? [], [data]);

  const visibleLeads = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return leads.filter((lead) => {
      if (filter !== 'all' && lead.status !== filter) return false;
      if (!needle) return true;

      return (
        lead.name.toLowerCase().includes(needle) ||
        lead.phone.toLowerCase().includes(needle) ||
        (lead.listing?.title ?? '').toLowerCase().includes(needle)
      );
    });
  }, [leads, filter, query]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  const openLead = useCallback(
    (lead: SellerLead) => {
      router.push({ pathname: '/(seller)/chi-tiet-khach-hang/[id]', params: { id: lead.id } } as never);
    },
    [router],
  );

  return (
    <View style={styles.flex}>
      {/* --- Header --------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>KHÁCH HÀNG</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          {isLoading ? 'Đang tải…' : `${formatNumber(leads.length)} khách quan tâm`}
        </Text>

        <View style={styles.searchWrap}>
          <AppInput
            placeholder="Tìm theo tên, số điện thoại, tin đăng"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={styles.searchInput}
            leftSlot={<Search size={16} color={colors.textMuted} strokeWidth={2.5} />}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={filter === option.key}
              onPress={() => setFilter(option.key)}
            />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <LoadingState message="Đang tải khách hàng…" />
      ) : error ? (
        <ErrorState title="Không tải được khách hàng" message={error} onRetry={reload} />
      ) : visibleLeads.length === 0 ? (
        <EmptyState
          title={leads.length === 0 ? 'Chưa có khách quan tâm' : 'Không tìm thấy kết quả'}
          description={
            leads.length === 0
              ? 'Khi người thuê để lại thông tin trên tin đăng của bạn, khách hàng sẽ xuất hiện ở đây.'
              : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
          }
          icon={Users}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {visibleLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onPress={() => openLead(lead)} />
          ))}
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
  searchWrap: {
    marginTop: spacing.lg,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingRight: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
});
