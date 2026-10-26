/**
 * `SellerListingCard` — one row of "Tin đăng của tôi" (SCENE 021).
 *
 * Unlike the tenant `ListingCard`, this card shows the moderation status
 * (pending / active / rejected) and the two management actions. The photo
 * comes from the listing's own `photos`/`image` field, resolved to an
 * absolute URL by `resolveMediaUrl`.
 */

import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Eye, MapPin, Pencil, Ruler, Trash2 } from 'lucide-react-native';

import { StatusBadge } from '@/components/ui';
import { resolveMediaUrl } from '@/lib/api-client';
import { formatArea, formatRent, formatShortAddress } from '@/lib/format';
import { listingStatusLabel, listingStatusVariant } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerListing } from '@/types/seller';

export interface SellerListingCardProps {
  listing: SellerListing;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Opens the public room detail screen. */
  onView?: () => void;
  /** A delete is in flight for this row. */
  deleting?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SellerListingCard({
  listing,
  onEdit,
  onDelete,
  onView,
  deleting = false,
  style,
}: SellerListingCardProps) {
  const firstPhoto = listing.photos?.[0] ?? listing.image ?? null;
  const photo = resolveMediaUrl(firstPhoto);
  const address = formatShortAddress(listing);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <Pressable
          onPress={onView}
          accessibilityRole="button"
          accessibilityLabel={`Xem tin ${listing.title}`}
          style={styles.photoWrap}
        >
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={[styles.photoFallbackText, { fontFamily: fontFamily.bold }]}>
                CHƯA CÓ ẢNH
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.info}>
          <StatusBadge label={listingStatusLabel(listing.status)} variant={listingStatusVariant(listing.status)} withDot />

          <Text numberOfLines={2} style={[styles.title, { fontFamily: fontFamily.bold }]}>
            {listing.title}
          </Text>

          {address ? (
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textMuted} strokeWidth={2.5} />
              <Text numberOfLines={1} style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
                {address}
              </Text>
            </View>
          ) : null}

          {listing.area ? (
            <View style={styles.metaRow}>
              <Ruler size={12} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
                {formatArea(listing.area)}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.price, { fontFamily: fontFamily.extrabold }]}>
            {formatRent(listing.rent)}
            <Text style={[styles.priceUnit, { fontFamily: fontFamily.medium }]}>/tháng</Text>
          </Text>
        </View>
      </View>

      {listing.status === 'rejected' && listing.rejectReason ? (
        <View style={styles.rejectBox}>
          <Text style={[styles.rejectText, { fontFamily: fontFamily.medium }]}>
            Lý do từ chối: {listing.rejectReason}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {onEdit ? <ActionButton icon={Pencil} label="Sửa" onPress={onEdit} /> : null}
        {onView ? <ActionButton icon={Eye} label="Xem" onPress={onView} /> : null}
        {onDelete ? (
          <ActionButton
            icon={Trash2}
            label={deleting ? 'Đang xóa…' : 'Xóa'}
            onPress={onDelete}
            danger
            disabled={deleting}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  icon: typeof Pencil;
  label: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        danger ? styles.actionDanger : null,
        pressed ? styles.actionPressed : null,
        disabled || !onPress ? styles.actionDisabled : null,
      ]}
    >
      <Icon size={14} color={danger ? colors.danger : colors.ink} strokeWidth={2.6} />
      <Text
        style={[
          styles.actionLabel,
          { fontFamily: fontFamily.semibold, color: danger ? colors.danger : colors.ink },
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
    ...shadow.sm,
  },
  top: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: {
    fontSize: 9,
    color: colors.textSubtle,
    letterSpacing: 0.4,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    marginTop: spacing.xs,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  price: {
    marginTop: spacing.xs,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  priceUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rejectBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  rejectText: {
    fontSize: fontSize.xs,
    color: colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.background,
  },
  actionDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    fontSize: fontSize.xs,
  },
});
