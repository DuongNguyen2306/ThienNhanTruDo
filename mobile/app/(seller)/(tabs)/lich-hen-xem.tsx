/**
 * SCENE 024 — Seller Appointments (Lịch hẹn xem phòng).
 *
 * `GET /api/seller/appointments` already scopes the query to
 * `listing.sellerId === req.user.id`, so this screen can only ever see
 * viewings of its own rooms.
 *
 * Status changes go through `PUT /api/seller/appointments/:id` with one of
 * the backend's status strings (`confirmed`, `cancelled`, `completed`). The
 * card is updated only after the response; on failure the previous state
 * is restored and the server message is shown.
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays } from 'lucide-react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { SellerAppointmentCard } from '@/components/seller';
import { FilterChip } from '@/components/tenant';
import { useAsyncData } from '@/hooks/use-async-data';
import { sellerApi } from '@/lib/api-client';
import { formatNumber } from '@/lib/format';
import { SELLER_APPOINTMENT_STATUS_OPTIONS } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, spacing } from '@/constants/theme';
import type { SellerAppointment } from '@/types/seller';

const FILTERS = [{ key: 'all', label: 'Tất cả' }, ...SELLER_APPOINTMENT_STATUS_OPTIONS] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default function SellerAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    const response = await sellerApi.appointments(filter === 'all' ? undefined : filter);
    return response.appointments;
  }, [filter]);

  const { data, isLoading, error, reload, setData } = useAsyncData<SellerAppointment[]>(fetcher, [
    filter,
  ]);

  const appointments = useMemo(() => data ?? [], [data]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }, [reload]);

  /**
   * Apply a status update.
   *
   * Optimistic on screen, authoritative on the server: the row is patched
   * immediately, then reverted if the API refuses.
   */
  const updateStatus = useCallback(
    async (appointment: SellerAppointment, status: string) => {
      if (busyId) return;

      const snapshot = data ?? [];
      setBusyId(appointment.id);
      setActionError(null);

      setData((current) =>
        (current ?? []).map((item) =>
          item.id === appointment.id ? { ...item, status } : item,
        ),
      );

      try {
        const result = await sellerApi.updateAppointment(appointment.id, status);
        // Use the authoritative row the backend sent back.
        setData((current) =>
          (current ?? []).map((item) =>
            item.id === appointment.id ? { ...item, ...result.appointment } : item,
          ),
        );
      } catch (caught) {
        setData(snapshot);
        setActionError(
          caught instanceof Error
            ? caught.message
            : 'Không cập nhật được lịch hẹn. Vui lòng thử lại.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [busyId, data, setData],
  );

  const confirmStatus = useCallback(
    (appointment: SellerAppointment, status: string, title: string, message: string) => {
      Alert.alert(title, message, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: () => void updateStatus(appointment, status),
        },
      ]);
    },
    [updateStatus],
  );

  const openListing = useCallback(
    (appointment: SellerAppointment) => {
      if (!appointment.listingId) return;
      router.push({
        pathname: '/(seller)/sua-tin/[id]',
        params: { id: appointment.listingId },
      } as never);
    },
    [router],
  );

  return (
    <View style={styles.flex}>
      {/* --- Header --------------------------------------------------- */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>LỊCH HẸN XEM</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          {isLoading ? 'Đang tải…' : `${formatNumber(appointments.length)} lịch hẹn`}
        </Text>

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

      {actionError ? (
        <View style={styles.errorBanner}>
          <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{actionError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingState message="Đang tải lịch hẹn…" />
      ) : error ? (
        <ErrorState title="Không tải được lịch hẹn" message={error} onRetry={reload} />
      ) : appointments.length === 0 ? (
        <EmptyState
          title={filter === 'all' ? 'Chưa có lịch hẹn nào' : 'Không có lịch hẹn ở trạng thái này'}
          description="Khi người thuê đặt lịch xem phòng, lịch hẹn sẽ xuất hiện ở đây để bạn xác nhận."
          icon={CalendarDays}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {appointments.map((appointment) => (
            <SellerAppointmentCard
              key={appointment.id}
              appointment={appointment}
              busy={busyId === appointment.id}
              onOpenListing={() => openListing(appointment)}
              onConfirm={() =>
                confirmStatus(
                  appointment,
                  'confirmed',
                  'Xác nhận lịch hẹn',
                  'Người thuê sẽ nhận được thông báo về lịch hẹn đã xác nhận.',
                )
              }
              onRefuse={() =>
                confirmStatus(
                  appointment,
                  'cancelled',
                  'Từ chối lịch hẹn',
                  'Lịch hẹn sẽ được chuyển sang trạng thái đã hủy.',
                )
              }
              onComplete={() =>
                confirmStatus(
                  appointment,
                  'completed',
                  'Đánh dấu đã xem',
                  'Xác nhận rằng buổi xem phòng đã diễn ra.',
                )
              }
            />
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
