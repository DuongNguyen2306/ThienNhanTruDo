/**
 * SCENE 022 — Create Listing (Đăng tin mới).
 *
 * Posts to `POST /api/seller/listings`. The backend ALWAYS stores the row
 * with `status: 'pending'` and answers "Tạo tin đăng thành công, đang chờ
 * duyệt" — the screen repeats that wording and never claims the listing is
 * live, because a manager still has to approve it.
 *
 * Validation runs locally first (so the seller sees the error next to the
 * field) and the backend validation errors are surfaced verbatim when the
 * request comes back with `details`.
 */

import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { AppHeader } from '@/components/ui';
import {
  EMPTY_LISTING_FORM,
  ListingForm,
  listingFormToPayload,
  validateListingForm,
  type ListingFormErrors,
  type ListingFormValues,
} from '@/components/seller';
import { useListingPhotos } from '@/hooks/use-listing-photos';
import { sellerApi } from '@/lib/api-client';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

const LISTINGS_ROUTE = '/(seller)/(tabs)/tin-dang';

export default function CreateListingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<ListingFormValues>(EMPTY_LISTING_FORM);
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /**
   * The photo flow.
   *
   * The hook is controlled: it reads `values.photos` / `values.newPhotos`
   * and writes every change back through `setValues`. The picked files are
   * uploaded BEFORE the listing is created, so the created row already
   * carries the real public URLs.
   */
  const photos = useListingPhotos(
    { value: { photos: values.photos, newPhotos: values.newPhotos }, onChange: (next) => setValues((current) => ({ ...current, photos: next.photos, newPhotos: next.newPhotos })) },
  );

  /** Guards against a double submit from two fast taps. */
  const inFlight = useRef(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(LISTINGS_ROUTE as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (inFlight.current) return;

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
      // 1) Upload the picked photos first. Their public URLs are the only
      //    thing that may be written into the listing.
      const uploaded = await photos.uploadNewPhotos();

      // 2) Create the listing with the stored photos plus the uploaded ones.
      const payload = listingFormToPayload(values);
      const result = await sellerApi.createListing({
        ...payload,
        photos: [...values.photos, ...uploaded],
      });

      // Success is announced only after the backend confirmed.
      setSuccessMessage(result.message || 'Tạo tin đăng thành công, đang chờ duyệt.');

      // Leave the form after a beat so the seller can read the confirmation.
      setTimeout(() => {
        router.replace(LISTINGS_ROUTE as never);
      }, 900);
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : 'Không tạo được tin đăng. Vui lòng thử lại.',
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [photos, router, values]);

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top }}>
          <AppHeader
            title="Đăng tin mới"
            subtitle="Tin sẽ được duyệt trước khi hiển thị"
            left={
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={10}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color={colors.ink} strokeWidth={2.8} />
              </Pressable>
            }
          />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.notice}>
            <Info size={16} color={colors.info} strokeWidth={2.5} />
            <Text style={[styles.noticeText, { fontFamily: fontFamily.regular }]}>
              Sau khi gửi, tin đăng ở trạng thái “Chờ duyệt”. Ban quản lý sẽ kiểm tra trước khi
              tin hiển thị công khai.
            </Text>
          </View>

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
            submitLabel="Gửi tin đăng"
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
      </KeyboardAvoidingView>
    </View>
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
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.info,
    backgroundColor: colors.infoSurface,
  },
  noticeText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.ink,
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
