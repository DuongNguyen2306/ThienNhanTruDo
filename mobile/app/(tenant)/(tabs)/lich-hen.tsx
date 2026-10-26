/**
 * SCENE 016 — Tenant appointments.
 *
 * The list of the viewings the tenant booked, from
 * `GET /api/tenant/appointments`. The screen is split into four tabs —
 * "Tất cả", "Chờ xác nhận", "Đã xác nhận" and "Đã hủy" — and every
 * appointment that has not been cancelled can be cancelled from here.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarDays, CalendarX2, MapPin, X } from 'lucide-react-native';

import { EmptyState, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { FilterChip } from '@/components/tenant';
import { tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { appointmentStatusLabel, formatDateTime, formatRent } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Appointment } from '@/types/listing';

/** The room detail screen (SCENE 011). */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The four tabs of the screen. */
const TABS = [
  { key: 'all', label: 'Tất cả', status: undefined },
  { key: 'pending', label: 'Chờ xác nhận', status: 'pending' },
  { key: 'confirmed', label: 'Đã xác nhận', status: 'confirmed' },
  { key: 'cancelled', label: 'Đã hủy', status: 'cancelled' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/** The badge variant that matches an appointment status. */
function badgeVariant(status: string): 'verified' | 'pending' | 'rejected' | 'info' {
  if (status === 'confirmed' || status === 'completed') return 'verified';
  if (status === 'cancelled') return 'rejected';
  if (status === 'pending') return 'pending';
  return 'info';
}

export default function TenantAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = TABS.find((item) => item.key === tab)?.status;

  const fetcher = useCallback(
    () => tenantApi.appointments(status),
    [status],
  );
  const { data, isLoading, error, reload, setData } = useAsyncData<{
    appointments: Appointment[];
    total: number;
  }>(fetcher, [status]);

  const appointments = useMemo(() => data?.appointments ?? [], [data]);

  const openDetail = useCallback(
    (listingId: string | undefined) => {
      if (!listingId) return;
      router.push({ pathname: DETAIL_ROUTE, params: { id: listingId } } as never);
    },
    [router],
  );

  /**
   * Cancel an appointment.
   *
   * The row is hidden right away; if the backend refuses, it comes back.
   */
  const cancel = useCallback(
    async (id: string) => {
      if (busyId) return;

      setBusyId(id);
      setActionError(null);
      const snapshot = data?.appointments ?? [];

      setData((current) => ({
        appointments: (current?.appointments ?? []).filter((item) => item.id !== id),
        total: Math.max(0, (current?.total ?? 0) - 1),
      }));

      try {
        await tenantApi.cancelAppointment(id);
      } catch (caught) {
        setData({ appointments: snapshot, total: snapshot.length });
        setActionError(
          caught instanceof Error ? caught.message : 'Không hủy được lịch hẹn. Vui lòng thử lại.',
        );
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
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>LỊCH HẸN XEM</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          {appointments.length} lịch hẹn
        </Text>
      </View>

      {/* --- Tabs ------------------------------------------------------ */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {TABS.map((item) => (
            <FilterChip
              key={item.key}
              label={item.label}
              selected={tab === item.key}
              onPress={() => setTab(item.key)}
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
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.ink} />
          }
        >
          {appointments.length === 0 ? (
            <EmptyState
              title="Chưa có lịch hẹn"
              description="Đặt hẹn xem một phòng để theo dõi tại đây."
              icon={CalendarDays}
            />
          ) : (
            appointments.map((appointment) => {
              const listing = appointment.listing;
              const canCancel = appointment.status === 'pending' || appointment.status === 'confirmed';

              return (
                <View key={appointment.id} style={styles.card}>
                  <Pressable
                    onPress={() => openDetail(listing?.id)}
                    accessibilityRole="button"
                    accessibilityLabel={listing?.title ?? 'Lịch hẹn'}
                    style={styles.cardTop}
                  >
                    <View style={styles.thumbWrap}>
                      {listing?.image ? (
                        <Image source={{ uri: listing.image }} style={styles.thumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumb, styles.thumbFallback]}>
                          <CalendarDays size={18} color={colors.textSubtle} strokeWidth={2.4} />
                        </View>
                      )}
                    </View>

                    <View style={styles.cardText}>
                      <Text numberOfLines={1} style={[styles.cardTitle, { fontFamily: fontFamily.bold }]}>
                        {listing?.title ?? 'Phòng đã bị gỡ'}
                      </Text>

                      {listing?.rent ? (
                        <Text style={[styles.cardPrice, { fontFamily: fontFamily.semibold }]}>
                          {formatRent(listing.rent)}/tháng
                        </Text>
                      ) : null}

                      {listing?.district || listing?.ward ? (
                        <View style={styles.metaRow}>
                          <MapPin size={12} color={colors.textMuted} strokeWidth={2.5} />
                          <Text
                            numberOfLines={1}
                            style={[styles.metaText, { fontFamily: fontFamily.regular }]}
                          >
                            {[listing.ward, listing.district, listing.city]
                              .filter(Boolean)
                              .join(', ')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>

                  <View style={styles.cardBottom}>
                    <View style={styles.whenRow}>
                      <CalendarDays size={14} color={colors.ink} strokeWidth={2.6} />
                      <Text style={[styles.whenText, { fontFamily: fontFamily.semibold }]}>
                        {formatDateTime(appointment.when)}
                      </Text>
                    </View>

                    <StatusBadge
                      label={appointmentStatusLabel(appointment.status)}
                      variant={badgeVariant(appointment.status)}
                      withDot
                    />
                  </View>

                  {appointment.note ? (
                    <Text style={[styles.note, { fontFamily: fontFamily.regular }]}>
                      “{appointment.note}”
                    </Text>
                  ) : null}

                  {canCancel ? (
                    <Pressable
                      onPress={() => {
                        void cancel(appointment.id);
                      }}
                      disabled={busyId === appointment.id}
                      accessibilityRole="button"
                      accessibilityLabel="Hủy lịch hẹn"
                      style={({ pressed }) => [
                        styles.cancelButton,
                        busyId === appointment.id ? styles.cancelButtonBusy : null,
                        pressed && styles.cancelButtonPressed,
                      ]}
                    >
                      <CalendarX2 size={15} color={colors.danger} strokeWidth={2.6} />
                      <Text style={[styles.cancelText, { fontFamily: fontFamily.bold }]}>
                        {busyId === appointment.id ? 'Đang hủy…' : 'Hủy lịch hẹn'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })
          )}
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

  tabBar: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  tabRow: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },

  errorBanner: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },

  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbWrap: {
    width: 76,
    height: 76,
  },
  thumb: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardPrice: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  whenText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  note: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  cancelButtonBusy: {
    opacity: 0.5,
  },
  cancelButtonPressed: {
    opacity: 0.75,
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
});
