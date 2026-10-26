/**
 * SCENE 013 — Book a viewing.
 *
 * The screen a tenant reaches from the room detail (SCENE 011) by
 * pressing "Hẹn xem". It collects:
 *
 *   1. the date and the hour of the viewing
 *   2. the phone number (pre-filled with the account's number)
 *   3. a note for the landlord
 *
 * The request goes to `POST /api/tenant/appointments`, which creates the
 * appointment and notifies both the landlord and the tenant.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarDays, Clock, MapPin, Phone } from 'lucide-react-native';

import { AppButton, AppInput, ErrorState, LoadingState } from '@/components/ui';
import { listingsApi, tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { useAuth } from '@/providers/auth-provider';
import { formatAddress, formatRent } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing } from '@/types/listing';

/** The success screen (SCENE 014). */
const SUCCESS_ROUTE = '/(tenant)/dat-hen-thanh-cong';

/** The hours the visitor can pick, as "HH:mm". */
const HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

/** The two weeks the visitor can pick, as "YYYY-MM-DD". */
const DAYS = Array.from({ length: 14 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index);
  return date.toISOString().slice(0, 10);
});

/** Turn "YYYY-MM-DD" + "HH:mm" into an ISO string the backend accepts. */
function toIso(date: string, hour: string): string {
  return new Date(`${date}T${hour}:00`).toISOString();
}

/** The Vietnamese label of a day, e.g. "Thứ 3, 26/10". */
function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(parsed);
}

export default function BookViewingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';
  const { user } = useAuth();

  const [date, setDate] = useState(DAYS[0] ?? '');
  const [hour, setHour] = useState('10:00');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetcher = useCallback(async () => {
    if (!listingId) throw new Error('Không tìm thấy tin đăng.');
    const result = await listingsApi.detail(listingId);
    return result.listing;
  }, [listingId]);

  const { data: listing, isLoading, error, reload } = useAsyncData<Listing>(fetcher, [listingId]);

  const when = useMemo(() => toIso(date, hour), [date, hour]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate('/(tenant)/(tabs)/tim-phong' as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const trimmedPhone = phone.replace(/\s/g, '');

    if (!trimmedPhone) {
      setFormError('Vui lòng nhập số điện thoại để chủ phòng liên hệ.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await tenantApi.createAppointment({
        listingId,
        when,
        phone: trimmedPhone,
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      router.replace({
        pathname: SUCCESS_ROUTE,
        params: { id: listingId, when },
      } as never);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Không đặt hẹn được. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [listingId, note, phone, router, submitting, when]);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang tải thông tin phòng…" />;
  }

  if (error || !listing) {
    return (
      <View style={styles.flex}>
        <View style={[styles.backRow, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Quay lại">
            <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
          </Pressable>
        </View>
        <ErrorState
          title="Không tải được tin đăng"
          message={error ?? 'Tin đăng không tồn tại.'}
          onRetry={reload}
          onBack={goBack}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.huge },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* --- Back ---------------------------------------------------- */}
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
        </Pressable>

        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>ĐẶT HẸN XEM PHÒNG</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Chọn thời gian thuận tiện. Chủ phòng sẽ xác nhận lại yêu cầu của bạn.
        </Text>

        {/* --- The room ------------------------------------------------- */}
        <View style={styles.roomCard}>
          <Text numberOfLines={2} style={[styles.roomTitle, { fontFamily: fontFamily.bold }]}>
            {listing.title}
          </Text>
          {formatAddress(listing) ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
                {formatAddress(listing)}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.roomPrice, { fontFamily: fontFamily.extrabold }]}>
            {formatRent(listing.rent)}/tháng
          </Text>
        </View>

        {/* --- Day ------------------------------------------------------ */}
        <Text style={[styles.label, { fontFamily: fontFamily.semibold }]}>Ngày xem</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {DAYS.map((day) => (
            <Pressable
              key={day}
              onPress={() => setDate(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: date === day }}
              accessibilityLabel={dayLabel(day)}
              style={({ pressed }) => [
                styles.pill,
                date === day ? styles.pillActive : null,
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: colors.ink,
                    fontFamily: date === day ? fontFamily.bold : fontFamily.medium,
                  },
                ]}
              >
                {dayLabel(day)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* --- Hour ----------------------------------------------------- */}
        <Text style={[styles.label, { fontFamily: fontFamily.semibold }]}>Giờ xem</Text>
        <View style={styles.hourWrap}>
          {HOURS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setHour(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: hour === item }}
              accessibilityLabel={item}
              style={({ pressed }) => [
                styles.hourPill,
                hour === item ? styles.hourPillActive : null,
                pressed && styles.pillPressed,
              ]}
            >
              <Clock size={13} color={colors.ink} strokeWidth={2.6} />
              <Text
                style={[
                  styles.hourText,
                  {
                    color: colors.ink,
                    fontFamily: hour === item ? fontFamily.bold : fontFamily.medium,
                  },
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* --- Contact -------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Số điện thoại"
            placeholder="0912345678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!submitting}
            leftSlot={<Phone size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            label="Ghi chú cho chủ phòng (không bắt buộc)"
            placeholder="VD: Mình muốn xem phòng vào buổi sáng…"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            style={styles.noteInput}
            editable={!submitting}
          />
        </View>

        {formError ? (
          <View style={styles.errorBanner}>
            <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
          </View>
        ) : null}

        {/* --- Summary -------------------------------------------------- */}
        <View style={styles.summaryCard}>
          <CalendarDays size={18} color={colors.ink} strokeWidth={2.6} />
          <View style={styles.summaryText}>
            <Text style={[styles.summaryLabel, { fontFamily: fontFamily.medium }]}>Thời gian đã chọn</Text>
            <Text style={[styles.summaryValue, { fontFamily: fontFamily.bold }]}>
              {dayLabel(date)} · {hour}
            </Text>
          </View>
        </View>

        <AppButton
          label="Gửi yêu cầu hẹn xem"
          size="lg"
          fullWidth
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          showAccentMark={!submitting}
          style={styles.submit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },

  backRow: {
    flexDirection: 'row',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  backButtonPressed: {
    opacity: 0.7,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },

  title: {
    marginTop: spacing.xl,
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: colors.textMuted,
  },

  roomCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  roomTitle: {
    fontSize: fontSize.lg,
    color: colors.ink,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  roomPrice: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    color: colors.ink,
  },

  label: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },

  pillRow: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  pillActive: {
    backgroundColor: colors.primary,
  },
  pillPressed: {
    opacity: 0.75,
  },
  pillText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  hourWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hourPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  hourPillActive: {
    backgroundColor: colors.primary,
  },
  hourText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  form: {
    marginTop: spacing.xl,
  },
  noteInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },

  errorBanner: {
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.danger,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },
  summaryValue: {
    marginTop: 2,
    fontSize: fontSize.md,
    color: colors.ink,
  },

  submit: {
    marginTop: spacing.lg,
  },
});
