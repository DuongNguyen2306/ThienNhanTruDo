/**
 * `ListingCard` — the room tile used by every list in the app.
 *
 * It shows the photo, the badges that the backend actually returns
 * (verified / VIP), the title, the address, the area, the rent and the
 * heart that saves the room.
 *
 * The card is presentational: the caller owns the data, the navigation
 * and the save action.
 */

import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { BadgeCheck, Crown, Heart, MapPin, Ruler } from 'lucide-react-native';

import { StatusBadge } from '@/components/ui/status-badge';
import { resolveMediaUrl } from '@/lib/api-client';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import { formatArea, formatRent, formatShortAddress } from '@/lib/format';
import type { Listing } from '@/types/listing';

export interface ListingCardProps {
  listing: Listing;
  /** Called when the card body is pressed. */
  onPress?: () => void;
  /** Whether the room is in the saved list. */
  saved?: boolean;
  /** Called when the heart is pressed. */
  onToggleSave?: () => void;
  /** Show the horizontal (list) layout instead of the vertical (grid) one. */
  horizontal?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The first photo of the listing, or `null` when there is none.
 *
 * The path is resolved to an absolute URL: the backend stores the relative
 * form (`/uploads/…`) for some rows and the full URL for others, so the
 * card never guesses — `resolveMediaUrl` handles both.
 */
export function listingPhoto(listing: Listing): string | null {
  if (listing.photos && listing.photos.length > 0) {
    return resolveMediaUrl(listing.photos[0]);
  }
  if (listing.image) return resolveMediaUrl(listing.image);
  return null;
}

export function ListingCard({
  listing,
  onPress,
  saved = false,
  onToggleSave,
  horizontal = false,
  style,
}: ListingCardProps) {
  const photo = listingPhoto(listing);
  const address = formatShortAddress(listing);
  const isVip = Boolean(listing.isVipActive ?? listing.vip);

  return (
    <View style={[styles.wrapper, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={listing.title}
        style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
      >
        {/* --- Photo ------------------------------------------------- */}
        <View style={styles.photoWrap}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={[styles.photoFallbackText, { fontFamily: fontFamily.bold }]}>
                CHƯA CÓ ẢNH
              </Text>
            </View>
          )}

          {/* Badges */}
          <View style={styles.badgeRow}>
            {listing.verified ? (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <BadgeCheck size={12} color={colors.ink} strokeWidth={3} />
                <Text style={[styles.badgeText, { fontFamily: fontFamily.bold }]}>Đã xác minh</Text>
              </View>
            ) : null}
            {isVip ? (
              <View style={[styles.badge, { backgroundColor: colors.successSurface }]}>
                <Crown size={12} color={colors.success} strokeWidth={3} />
                <Text style={[styles.badgeText, { fontFamily: fontFamily.bold, color: colors.success }]}>
                  VIP
                </Text>
              </View>
            ) : null}
          </View>

          {/* Heart */}
          {onToggleSave ? (
            <Pressable
              onPress={onToggleSave}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Bỏ lưu tin đăng' : 'Lưu tin đăng'}
              hitSlop={8}
              style={({ pressed }) => [styles.heart, pressed && styles.heartPressed]}
            >
              <Heart
                size={18}
                color={saved ? colors.danger : colors.ink}
                strokeWidth={2.5}
                fill={saved ? colors.danger : 'transparent'}
              />
            </Pressable>
          ) : null}
        </View>

        {/* --- Body -------------------------------------------------- */}
        <View style={styles.body}>
          <Text numberOfLines={2} style={[styles.title, { fontFamily: fontFamily.bold }]}>
            {listing.title}
          </Text>

          {address ? (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textMuted} strokeWidth={2.5} />
              <Text numberOfLines={1} style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
                {address}
              </Text>
            </View>
          ) : null}

          {listing.area ? (
            <View style={styles.metaRow}>
              <Ruler size={13} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>
                {formatArea(listing.area)}
                {listing.depositMonths ? ` · Cọc ${listing.depositMonths} tháng` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.footer}>
            <Text style={[styles.price, { fontFamily: fontFamily.extrabold }]}>
              {formatRent(listing.rent)}
              <Text style={[styles.priceUnit, { fontFamily: fontFamily.medium }]}>/tháng</Text>
            </Text>

            {listing.vacantNow ? (
              <View style={styles.vacantTag}>
                <Text style={[styles.vacantText, { fontFamily: fontFamily.bold }]}>Trống ngay</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
  },
  card: {
    flexDirection: 'column',
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.md,
    ...({ boxShadow: '3px 3px 0 #151515' } as object),
  },
  cardPressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },

  photoWrap: {
    width: '100%',
    height: 160,
    backgroundColor: colors.borderMuted,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  photoFallbackText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    letterSpacing: 0.6,
  },

  badgeRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },

  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  heartPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },

  body: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 21,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  price: {
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  priceUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  vacantTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
  },
  vacantText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
});
