/**
 * SCENE 014 — Booking success.
 *
 * The confirmation screen shown after a viewing request was accepted by
 * the backend. It confirms the time, links back to the room and points
 * the visitor at their appointment list.
 */

import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, CheckCircle2, MapPin } from 'lucide-react-native';

import { AppButton, ErrorState, LoadingState } from '@/components/ui';
import { listingsApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { formatAddress, formatDateTime } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing } from '@/types/listing';

/** The room detail screen (SCENE 011). */
const DETAIL_ROUTE = '/(tenant)/chi-tiet-phong';

/** The appointment list (SCENE 016). */
const APPOINTMENTS_ROUTE = '/(tenant)/(tabs)/lich-hen';

export default function BookingSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; when?: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';
  const when = typeof params.when === 'string' ? params.when : '';

  const fetcher = useCallback(async () => {
    if (!listingId) return null;
    const result = await listingsApi.detail(listingId);
    return result.listing;
  }, [listingId]);

  const { data: listing, isLoading, error } = useAsyncData<Listing | null>(fetcher, [listingId]);

  const goToAppointments = useCallback(() => {
    router.navigate(APPOINTMENTS_ROUTE as never);
  }, [router]);

  const goToDetail = useCallback(() => {
    router.replace({ pathname: DETAIL_ROUTE, params: { id: listingId } } as never);
  }, [listingId, router]);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang xác nhận…" />;
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <ErrorState
          title="Không tải được thông tin"
          message={error}
          onRetry={goToAppointments}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* --- The tick ------------------------------------------------- */}
        <View style={styles.tickBox}>
          <CheckCircle2 size={56} color={colors.ink} strokeWidth={2.6} />
        </View>

        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>ĐẶT HẸN THÀNH CÔNG!</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Yêu cầu xem phòng đã được gửi tới chủ phòng. Bạn sẽ nhận được xác nhận trong danh
          sách lịch hẹn.
        </Text>

        {/* --- Details ---------------------------------------------------- */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <CalendarCheck size={18} color={colors.ink} strokeWidth={2.6} />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardLabel, { fontFamily: fontFamily.medium }]}>Thời gian</Text>
              <Text style={[styles.cardValue, { fontFamily: fontFamily.bold }]}>
                {formatDateTime(when)}
              </Text>
            </View>
          </View>

          {listing ? (
            <View style={styles.cardRow}>
              <View style={styles.iconBox}>
                <MapPin size={18} color={colors.ink} strokeWidth={2.6} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { fontFamily: fontFamily.medium }]}>Phòng</Text>
                <Text style={[styles.cardValue, { fontFamily: fontFamily.bold }]}>
                  {listing.title}
                </Text>
                {formatAddress(listing) ? (
                  <Text style={[styles.cardSub, { fontFamily: fontFamily.regular }]}>
                    {formatAddress(listing)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        {/* --- Actions ---------------------------------------------------- */}
        <View style={styles.actions}>
          <AppButton
            label="Xem lịch hẹn"
            size="lg"
            fullWidth
            onPress={goToAppointments}
            showAccentMark
          />

          {listing ? (
            <AppButton
              label="Quay lại tin đăng"
              variant="secondary"
              fullWidth
              onPress={goToDetail}
              style={styles.secondaryAction}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },

  tickBox: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: borderWidth.lg,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  title: {
    marginTop: spacing.xl,
    fontSize: fontSize.xxl,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },

  card: {
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  cardText: {
    flex: 1,
  },
  cardLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cardValue: {
    marginTop: 2,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  cardSub: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  actions: {
    marginTop: spacing.xxl,
  },
  secondaryAction: {
    marginTop: spacing.md,
  },
});
