/**
 * `SellerAppointmentCard` — one viewing appointment (SCENE 024).
 *
 * The tenant's name and phone are shown because
 * `GET /api/seller/appointments` includes them — but ONLY for appointments
 * on this seller's own listings, which the backend enforces.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { CalendarClock, Home, Phone } from 'lucide-react-native';

import { StatusBadge } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { appointmentStatusLabel, appointmentStatusVariant } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerAppointment } from '@/types/seller';

export interface SellerAppointmentCardProps {
  appointment: SellerAppointment;
  /** The status update currently in flight, if any. */
  busy?: boolean;
  onConfirm?: () => void;
  onRefuse?: () => void;
  onComplete?: () => void;
  onOpenListing?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SellerAppointmentCard({
  appointment,
  busy = false,
  onConfirm,
  onRefuse,
  onComplete,
  onOpenListing,
  style,
}: SellerAppointmentCardProps) {
  const status = appointment.status;
  const phone = appointment.phone ?? appointment.tenant?.phone ?? null;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.headerRow}>
        <StatusBadge
          label={appointmentStatusLabel(status)}
          variant={appointmentStatusVariant(status)}
          withDot
        />
        <Text style={[styles.when, { fontFamily: fontFamily.semibold }]}>
          {formatDateTime(appointment.when)}
        </Text>
      </View>

      <Pressable
        onPress={onOpenListing}
        disabled={!onOpenListing}
        accessibilityRole={onOpenListing ? 'button' : undefined}
        style={styles.row}
      >
        <Home size={14} color={colors.textMuted} strokeWidth={2.5} />
        <Text numberOfLines={2} style={[styles.listingTitle, { fontFamily: fontFamily.bold }]}>
          {appointment.listing?.title ?? 'Tin đăng không còn tồn tại'}
        </Text>
      </Pressable>

      <View style={styles.row}>
        <CalendarClock size={14} color={colors.textMuted} strokeWidth={2.5} />
        <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
          {appointment.tenant?.fullName ?? 'Khách thuê'}
        </Text>
      </View>

      {phone ? (
        <View style={styles.row}>
          <Phone size={14} color={colors.textMuted} strokeWidth={2.5} />
          <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>{phone}</Text>
        </View>
      ) : null}

      {appointment.note ? (
        <View style={styles.noteBox}>
          <Text style={[styles.noteText, { fontFamily: fontFamily.regular }]}>
            “{appointment.note}”
          </Text>
        </View>
      ) : null}

      {onConfirm || onRefuse || onComplete ? (
        <View style={styles.actions}>
          {status === 'pending' && onConfirm ? (
            <Action label={busy ? 'Đang lưu…' : 'Xác nhận'} onPress={onConfirm} disabled={busy} primary />
          ) : null}
          {status === 'pending' && onRefuse ? (
            <Action label="Từ chối" onPress={onRefuse} disabled={busy} danger />
          ) : null}
          {status === 'confirmed' && onComplete ? (
            <Action label={busy ? 'Đang lưu…' : 'Đã xem'} onPress={onComplete} disabled={busy} primary />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Action({
  label,
  onPress,
  disabled,
  primary = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : null,
        danger ? styles.actionDanger : null,
        pressed ? styles.actionPressed : null,
        disabled ? styles.actionDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.actionLabel,
          {
            fontFamily: fontFamily.bold,
            color: danger ? colors.danger : colors.ink,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  when: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listingTitle: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 20,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  noteBox: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    borderWidth: borderWidth.sm,
    borderColor: colors.borderMuted,
  },
  noteText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  action: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  actionPressed: {
    opacity: 0.75,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionLabel: {
    fontSize: fontSize.sm,
  },
});
