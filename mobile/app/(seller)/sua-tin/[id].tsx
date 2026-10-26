/**
 * SCENE 023 — Edit Listing (Chỉnh sửa tin).
 *
 * Loads the listing from `GET /api/seller/listings/:id` (ownership is
 * enforced by the backend — a seller can only read their own row), fills
 * the same form used by SCENE 022 and saves through
 * `PUT /api/seller/listings/:id`.
 *
 * Only the fields the backend allows are sent: the payload builder is
 * shared with the create screen, so an unmodelled column can never be
 * overwritten by accident.
 *
 * Two behaviours worth noting:
 *   - The backend flips a `rejected` / `inactive` listing back to `pending`
 *     on save, so the confirmation wording reflects whatever status the
 *     response carries.
 *   - Photos are kept unless the seller explicitly removes one; existing
 *     URLs are re-sent as they were.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { ArrowLeft, Info } from 'lucide-react-native';

import { AppHeader, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import {
  EMPTY_LISTING_FORM,
  ListingForm,
  listingFormToPayload,
  validateListingForm,
  type ListingFormErrors,
  type ListingFormValues,
} from '@/components/seller';
import { useAsyncData } from '@/hooks/use-async-data';
import { useListingPhotos } from '@/hooks/use-listing-photos';
import { sellerApi } from '@/lib/api-client';
import { listingStatusLabel, listingStatusVariant } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { SellerListing } from '@/types/seller';

const LISTINGS_ROUTE = '/(seller)/(tabs)/tin-dang';

/** Map a backend listing onto the string-based form state. */
function listingToForm(listing: SellerListing): ListingFormValues {
  const text = (value: string | number | null | undefined) =>
    value === null || value === undefined ? '' : String(value);

  return {
    ...EMPTY_LISTING_FORM,
    title: listing.title ?? '',
    roomType: listing.roomType ?? 'phong-tro',
    rent: text(listing.rent),
    area: text(listing.area),
    houseNumber: text(listing.houseNumber),
    alley: text(listing.alley),
    street: text(listing.street),
    ward: text(listing.ward),
    district: text(listing.district),
    city: listing.city ?? 'TP Hồ Chí Minh',
    depositMonths: text(listing.depositMonths ?? 1),
    electricity: text(listing.electricity),
    water: text(listing.water),
    internet: text(listing.internet),
    sanitation: text(listing.sanitation),
    parkingBike: text(listing.parkingBike),
    managementFee: text(listing.managementFee),
    direction: listing.direction ?? '',
    floor: text(listing.floor),
    totalFloors: text(listing.totalFloors),
    availableFrom: listing.availableFrom ?? '',
    vacantNow: listing.vacantNow ?? true,
    furniture: listing.furniture ?? false,
    pets: listing.pets ?? false,
    amenities: Array.isArray(listing.amenities) ? listing.amenities : [],
    photos: Array.isArray(listing.photos) ? listing.photos : [],
    newPhotos: [],
  };
}

export default function EditListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const listingId = typeof params.id === 'string' ? params.id : '';

  const [values, setValues] = useState<ListingFormValues>(EMPTY_LISTING_FORM);
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hydratedId, setHydratedId] = useState<string | null>(null);

  const inFlight = useRef(false);

  const fetcher = useCallback(async () => {
    if (!listingId) throw new Error('Không tìm thấy tin đăng.');
    const result = await sellerApi.listing(listingId);
    return result.listing;
  }, [listingId]);

  const { data: listing, isLoading, error, reload } = useAsyncData<SellerListing>(fetcher, [listingId]);

  /**
   * The photo flow.
   *
   * Controlled by the form state, exactly like on the create screen. The
   * picked files are uploaded BEFORE the listing is updated, so the saved
   * row always carries real public URLs — never a local `file://` path.
   */
  const photos = useListingPhotos({
    value: { photos: values.photos, newPhotos: values.newPhotos },
    onChange: (next) =>
      setValues((current) => ({ ...current, photos: next.photos, newPhotos: next.newPhotos })),
  });

  // Fill the form once per listing — re-rendering must not wipe what the
  // seller has already typed.
  useEffect(() => {
    if (listing && hydratedId !== listing.id) {
      setValues(listingToForm(listing));
      setHydratedId(listing.id);
    }
  }, [listing, hydratedId]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(LISTINGS_ROUTE as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (inFlight.current || !listingId) return;

    const validationErrors = validateListingForm(values);
    setErrors(validationErrors);
    setFormError(null);
    setSuccessMessage(null);

    if (Object.keys(validationErrors).length > 0) {
      setFormError('Vui lòng kiểm tra lại các trường được đánh dấu.');
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    try {
      // 1) Upload the picked photos first. If this fails, the listing is
      //    NOT touched and the old photos stay exactly as they were.
      const uploaded = await photos.uploadNewPhotos();

      // 2) Save the listing with the kept photos plus the uploaded ones.
      const payload = listingFormToPayload(values);
      const result = await sellerApi.updateListing(listingId, {
        ...payload,
        photos: [...values.photos, ...uploaded],
      });

      const status = result.listing?.status;
      setSuccessMessage(
        status && status !== 'active'
          ? `${result.message}. Trạng thái hiện tại: ${listingStatusLabel(status)}.`
          : result.message || 'Cập nhật tin đăng thành công.',
      );

      setTimeout(() => {
        router.replace(LISTINGS_ROUTE as never);
      }, 900);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'Không cập nhật được tin đăng. Vui lòng thử lại.',
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [listingId, photos, router, values]);

  const statusBadge = useMemo(() => {
    if (!listing?.status) return null;
    return (
      <StatusBadge
        label={listingStatusLabel(listing.status)}
        variant={listingStatusVariant(listing.status)}
        withDot
      />
    );
  }, [listing?.status]);

  if (!listingId) {
    return (
      <View style={styles.flex}>
        <View style={{ paddingTop: insets.top }}>
          <AppHeader title="Chỉnh sửa tin" left={<BackButton onPress={goBack} />} />
        </View>
        <ErrorState
          title="Thiếu thông tin tin đăng"
          message="Không xác định được tin đăng cần chỉnh sửa."
          onBack={goBack}
        />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top }}>
          <AppHeader
            title="Chỉnh sửa tin"
            subtitle={listing?.title ?? 'Đang tải…'}
            left={<BackButton onPress={goBack} />}
          />
        </View>

        {isLoading ? (
          <LoadingState message="Đang tải tin đăng…" />
        ) : error ? (
          <ErrorState title="Không tải được tin đăng" message={error} onRetry={reload} onBack={goBack} />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.statusRow}>
              {statusBadge}
              <Text style={[styles.statusHint, { fontFamily: fontFamily.regular }]}>
                {listing?.status === 'active'
                  ? 'Tin đang hiển thị công khai.'
                  : 'Lưu thay đổi sẽ đưa tin về trạng thái chờ duyệt lại.'}
              </Text>
            </View>

            {listing?.rejectReason ? (
              <View style={styles.rejectBox}>
                <Info size={15} color={colors.danger} strokeWidth={2.5} />
                <Text style={[styles.rejectText, { fontFamily: fontFamily.medium }]}>
                  Lý do từ chối trước đó: {listing.rejectReason}
                </Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Text style={[styles.successText, { fontFamily: fontFamily.semibold }]}>
                  {successMessage}
                </Text>
              </View>
            ) : null}

            <ListingForm
              values={values}
              onChange={setValues}
              errors={errors}
              submitLabel="Lưu thay đổi"
              submitting={submitting || successMessage !== null}
              onSubmit={handleSubmit}
              formError={formError}
              onPickPhotos={() => void photos.pickPhotos()}
              onRemovePhoto={photos.removePhoto}
              onRemoveNewPhoto={photos.removeNewPhoto}
              isUploadingPhotos={photos.isUploading}
              photoError={photos.error}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={10}
      style={styles.backButton}
    >
      <ArrowLeft size={20} color={colors.ink} strokeWidth={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusHint: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },
  rejectBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  rejectText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.danger,
    lineHeight: 18,
  },
  successBanner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
});
