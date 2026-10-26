/**
 * SCENE 011 — Room detail.
 *
 * The screen a visitor reaches by tapping a room card. It shows:
 *
 *   1. the photo gallery (SCENE 012 opens the full-screen viewer)
 *   2. the badges, the title, the address
 *   3. the price, the area, the deposit
 *   4. the fee table (electricity, water, internet, parking…)
 *   5. the amenities
 *   6. the map position
 *   7. the landlord card
 *   8. the reviews
 *   9. the sticky footer: save + "Hẹn xem"
 *
 * Everything comes from `GET /api/listings/:id`, which also carries the
 * seller and the latest ten reviews.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Crown,
  Heart,
  MapPin,
  Phone,
  Ruler,
  Star,
} from 'lucide-react-native';

import { AppButton, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { listingsApi, resolveMediaUrl, tenantApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import {
  formatAddress,
  formatArea,
  formatDate,
  formatRent,
  formatShortAddress,
} from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { Listing } from '@/types/listing';

/** The gallery screen (SCENE 012). */
const GALLERY_ROUTE = '/(tenant)/thu-vien';

/** The booking screen (SCENE 013). */
const BOOKING_ROUTE = '/(tenant)/dat-hen-xem';

/** The saved-rooms screen (SCENE 015). */
const SAVED_ROUTE = '/(tenant)/(tabs)/da-luu';

export default function RoomDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';

  const [saved, setSaved] = useState(false);
  const [savingBusy, setSavingBusy] = useState(false);

  const fetcher = useCallback(async () => {
    if (!listingId) throw new Error('Không tìm thấy tin đăng.');
    const result = await listingsApi.detail(listingId);
    return result.listing;
  }, [listingId]);

  const { data: listing, isLoading, error, reload } = useAsyncData<Listing>(fetcher, [listingId]);

  const photos = useMemo(() => {
    if (!listing) return [];
    if (listing.photos && listing.photos.length > 0) return listing.photos;
    return listing.image ? [listing.image] : [];
  }, [listing]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(SAVED_ROUTE as never);
    }
  }, [router]);

  const openGallery = useCallback(() => {
    if (!listing) return;
    router.push({ pathname: GALLERY_ROUTE, params: { id: listing.id } } as never);
  }, [listing, router]);

  const openBooking = useCallback(() => {
    if (!listing) return;
    router.push({ pathname: BOOKING_ROUTE, params: { id: listing.id } } as never);
  }, [listing, router]);

  /**
   * Save / un-save the room.
   *
   * The backend answers 409 when the room is already saved, so the local
   * flag is only flipped after a successful call.
   */
  const toggleSave = useCallback(async () => {
    if (!listing || savingBusy) return;

    setSavingBusy(true);

    try {
      if (saved) {
        await tenantApi.unsaveListing(listing.id);
      } else {
        await tenantApi.saveListing(listing.id);
      }
      setSaved((value) => !value);
    } catch {
      // The failure is silent here: the heart simply stays as it was.
    } finally {
      setSavingBusy(false);
    }
  }, [listing, saved, savingBusy]);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang tải tin đăng…" />;
  }

  if (error || !listing) {
    return (
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Quay lại">
            <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
          </Pressable>
        </View>
        <ErrorState
          title="Không tải được tin đăng"
          message={error ?? 'Tin đăng không tồn tại hoặc đã bị gỡ.'}
          onRetry={reload}
          onBack={goBack}
        />
      </View>
    );
  }

  const address = formatAddress(listing);
  const shortAddress = formatShortAddress(listing);
  const isVip = Boolean(listing.isVipActive ?? listing.vip);

  const fees: Array<{ label: string; value: string }> = [
    { label: 'Tiền cọc', value: listing.depositMonths ? `${listing.depositMonths} tháng` : '—' },
    {
      label: 'Điện',
      value: listing.electricity ? `${formatRent(listing.electricity)}/kWh` : '—',
    },
    { label: 'Nước', value: listing.water ? `${formatRent(listing.water)}/tháng` : '—' },
    { label: 'Internet', value: listing.internet ? `${formatRent(listing.internet)}/tháng` : '—' },
    {
      label: 'Giữ xe máy',
      value: listing.parkingBike !== null && listing.parkingBike !== undefined
        ? formatRent(listing.parkingBike)
        : '—',
    },
    {
      label: 'Giữ xe ô tô',
      value: listing.parkingCar !== null && listing.parkingCar !== undefined
        ? formatRent(listing.parkingCar)
        : '—',
    },
    {
      label: 'Phí quản lý',
      value:
        listing.managementFee !== null && listing.managementFee !== undefined
          ? formatRent(listing.managementFee)
          : '—',
    },
  ];

  return (
    <View style={styles.flex}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* --- Gallery ------------------------------------------------ */}
        <Pressable onPress={openGallery} accessibilityRole="imagebutton" accessibilityLabel="Xem thư viện ảnh">
          <View style={styles.coverWrap}>
            {photos.length > 0 ? (
              <Image
                source={{ uri: resolveMediaUrl(photos[0]) ?? photos[0] }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={[styles.coverFallbackText, { fontFamily: fontFamily.bold }]}>
                  CHƯA CÓ ẢNH
                </Text>
              </View>
            )}

            <View style={styles.coverBadges}>
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

            {photos.length > 1 ? (
              <View style={styles.photoCount}>
                <Text style={[styles.photoCountText, { fontFamily: fontFamily.bold }]}>
                  {photos.length} ảnh
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>

        {/* --- Title block -------------------------------------------- */}
        <View style={styles.block}>
          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>{listing.title}</Text>

          {shortAddress ? (
            <View style={styles.metaRow}>
              <MapPin size={15} color={colors.textMuted} strokeWidth={2.5} />
              <Text style={[styles.metaText, { fontFamily: fontFamily.regular }]}>{shortAddress}</Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={[styles.price, { fontFamily: fontFamily.extrabold }]}>
              {formatRent(listing.rent)}
              <Text style={[styles.priceUnit, { fontFamily: fontFamily.medium }]}>/tháng</Text>
            </Text>

            {listing.area ? (
              <View style={styles.areaTag}>
                <Ruler size={13} color={colors.ink} strokeWidth={2.5} />
                <Text style={[styles.areaText, { fontFamily: fontFamily.bold }]}>
                  {formatArea(listing.area)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.tagRow}>
            {listing.vacantNow ? <StatusBadge label="Trống ngay" variant="verified" withDot /> : null}
            {listing.furniture ? <StatusBadge label="Nội thất có sẵn" variant="info" /> : null}
            {listing.pets ? <StatusBadge label="Cho nuôi thú cưng" variant="primary" /> : null}
            {listing.highTrust ? <StatusBadge label="High Trust" variant="neutral" /> : null}
          </View>
        </View>

        {/* --- Fee table ---------------------------------------------- */}
        <View style={styles.block}>
          <Text style={[styles.blockTitle, { fontFamily: fontFamily.extrabold }]}>BẢNG GIÁ</Text>

          {fees.map((fee) => (
            <View key={fee.label} style={styles.feeRow}>
              <Text style={[styles.feeLabel, { fontFamily: fontFamily.regular }]}>{fee.label}</Text>
              <Text style={[styles.feeValue, { fontFamily: fontFamily.semibold }]}>{fee.value}</Text>
            </View>
          ))}
        </View>

        {/* --- Amenities ---------------------------------------------- */}
        {listing.amenities && listing.amenities.length > 0 ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontFamily: fontFamily.extrabold }]}>TIỆN ÍCH</Text>
            <View style={styles.amenityWrap}>
              {listing.amenities.map((amenity) => (
                <View key={amenity} style={styles.amenity}>
                  <Text style={[styles.amenityText, { fontFamily: fontFamily.medium }]}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* --- Address & map ------------------------------------------ */}
        {address ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontFamily: fontFamily.extrabold }]}>ĐỊA CHỈ</Text>
            <Text style={[styles.addressText, { fontFamily: fontFamily.regular }]}>{address}</Text>
            {listing.lat !== null && listing.lat !== undefined && listing.lng !== null && listing.lng !== undefined ? (
              <Text style={[styles.coordText, { fontFamily: fontFamily.medium }]}>
                {listing.lat.toFixed(6)}, {listing.lng.toFixed(6)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* --- Landlord ----------------------------------------------- */}
        {listing.seller ? (
          <View style={styles.block}>
            <Text style={[styles.blockTitle, { fontFamily: fontFamily.extrabold }]}>CHỦ PHÒNG</Text>
            <View style={styles.sellerRow}>
              <View style={styles.avatar}>
                <Text style={[styles.avatarText, { fontFamily: fontFamily.extrabold }]}>
                  {(listing.seller.fullName ?? '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sellerText}>
                <Text style={[styles.sellerName, { fontFamily: fontFamily.bold }]}>
                  {listing.seller.fullName}
                </Text>
                {listing.seller.sellerProfile?.trustScore ? (
                  <Text style={[styles.sellerMeta, { fontFamily: fontFamily.regular }]}>
                    Điểm uy tín {listing.seller.sellerProfile.trustScore}
                  </Text>
                ) : null}
              </View>
              {listing.seller.phone ? (
                <Phone size={18} color={colors.ink} strokeWidth={2.5} />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* --- Reviews ------------------------------------------------- */}
        <View style={styles.block}>
          <View style={styles.reviewHeader}>
            <Text style={[styles.blockTitle, { fontFamily: fontFamily.extrabold }]}>ĐÁNH GIÁ</Text>
            {listing.reviewCount ? (
              <View style={styles.ratingRow}>
                <Star size={15} color={colors.primaryDark} strokeWidth={2.5} fill={colors.primary} />
                <Text style={[styles.ratingText, { fontFamily: fontFamily.bold }]}>
                  {(listing.rating ?? 0).toFixed(1)} ({listing.reviewCount})
                </Text>
              </View>
            ) : null}
          </View>

          {listing.reviews && listing.reviews.length > 0 ? (
            listing.reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <Text style={[styles.reviewAuthor, { fontFamily: fontFamily.bold }]}>
                    {review.author?.fullName ?? 'Người thuê'}
                  </Text>
                  <Text style={[styles.reviewDate, { fontFamily: fontFamily.regular }]}>
                    {formatDate(review.createdAt)}
                  </Text>
                </View>
                <View style={styles.reviewTop}>
                  <View style={styles.ratingRow}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={13}
                        color={index < Math.round(review.score) ? colors.primaryDark : colors.borderMuted}
                        strokeWidth={2.5}
                        fill={index < Math.round(review.score) ? colors.primary : 'transparent'}
                      />
                    ))}
                  </View>
                  {review.verifiedStay ? (
                    <StatusBadge label="Đã xem thực tế" variant="verified" />
                  ) : null}
                </View>
                {review.text ? (
                  <Text style={[styles.reviewText, { fontFamily: fontFamily.regular }]}>{review.text}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={[styles.noReview, { fontFamily: fontFamily.regular }]}>
              Chưa có đánh giá nào cho tin đăng này.
            </Text>
          )}
        </View>

        <View style={[styles.footerSpace, { height: 110 + insets.bottom }]} />
      </ScrollView>

      {/* --- Top bar (floating) --------------------------------------- */}
      <View style={styles.topBar}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
        >
          <ArrowLeft size={20} color={colors.ink} strokeWidth={3} />
        </Pressable>

        <Pressable
          onPress={toggleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Bỏ lưu tin đăng' : 'Lưu tin đăng'}
          hitSlop={8}
          style={({ pressed }) => [styles.topButton, pressed && styles.topButtonPressed]}
        >
          <Heart
            size={20}
            color={saved ? colors.danger : colors.ink}
            strokeWidth={2.5}
            fill={saved ? colors.danger : 'transparent'}
          />
        </Pressable>
      </View>

      {/* --- Sticky footer -------------------------------------------- */}
      <View
        style={[
          styles.footer,
          // BUG-03 — the sticky footer must clear the Home Indicator too.
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <AppButton
          label={saved ? 'Đã lưu' : 'Lưu phòng'}
          variant="secondary"
          onPress={toggleSave}
          loading={savingBusy}
          disabled={savingBusy}
          style={styles.footerSave}
        />
        <AppButton
          label="Hẹn xem"
          size="lg"
          onPress={openBooking}
          showAccentMark
          trailingIcon={<CalendarDays size={18} color={colors.ink} strokeWidth={2.8} />}
          style={styles.footerBook}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  coverWrap: {
    width: '100%',
    height: 260,
    backgroundColor: colors.borderMuted,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  coverFallbackText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    letterSpacing: 0.6,
  },
  coverBadges: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
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
  photoCount: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  photoCountText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  topButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  topButtonPressed: {
    opacity: 0.7,
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },

  block: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  blockTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },

  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  price: {
    fontSize: fontSize.xxl,
    color: colors.ink,
  },
  priceUnit: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.background,
  },
  areaText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  feeLabel: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
  feeValue: {
    fontSize: fontSize.md,
    color: colors.ink,
  },

  amenityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenity: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.background,
  },
  amenityText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  addressText: {
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 22,
  },
  coordText: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  sellerText: {
    flex: 1,
  },
  sellerName: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  sellerMeta: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  reviewCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.sm,
    borderColor: colors.borderMuted,
    backgroundColor: colors.background,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewAuthor: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
  reviewText: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 21,
  },
  noReview: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  footerSpace: {
    height: 110,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // The real bottom padding is applied inline from the safe-area inset.
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: borderWidth.md,
    borderTopColor: colors.ink,
  },
  footerSave: {
    flex: 1,
  },
  footerBook: {
    flex: 1.4,
  },
});
