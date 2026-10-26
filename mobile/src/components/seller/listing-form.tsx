/**
 * `ListingForm` — the create/edit listing form (SCENE 022 / SCENE 023).
 *
 * The fields below are EXACTLY the ones `POST /api/seller/listings` reads
 * and `PUT /api/seller/listings/:id` allows in
 * `backend/src/routes/seller.js`. The backend's `Listing` model has no
 * description column, so no description field is offered — sending one
 * would be silently dropped.
 *
 * Photos: the form shows two kinds of photos side by side.
 *
 *   - the URLs already stored on the server (`values.photos`)
 *   - the files just picked on the device (`values.newPhotos`), which are
 *     local `file://` URIs and are NOT part of the payload
 *
 * The picked files are uploaded through `POST /api/seller/upload` by the
 * screen that owns the form; only the returned URLs are ever written to
 * `Listing.photos`. A local URI never reaches the backend.
 */

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ImagePlus, Loader2, X } from 'lucide-react-native';

import { AppButton, AppCard, AppInput } from '@/components/ui';
import { FilterChip } from '@/components/tenant';
import { resolveMediaUrl } from '@/lib/api-client';
import { MAX_LISTING_PHOTOS, type LocalPhoto } from '@/hooks/use-listing-photos';
import { AMENITY_OPTIONS, DIRECTION_OPTIONS, ROOM_TYPE_OPTIONS } from '@/lib/seller-format';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

/** The form's string state — every number is a string while typing. */
export interface ListingFormValues {
  title: string;
  roomType: string;
  rent: string;
  area: string;
  houseNumber: string;
  alley: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  depositMonths: string;
  electricity: string;
  water: string;
  internet: string;
  sanitation: string;
  parkingBike: string;
  managementFee: string;
  direction: string;
  floor: string;
  totalFloors: string;
  availableFrom: string;
  vacantNow: boolean;
  furniture: boolean;
  pets: boolean;
  amenities: string[];
  photos: string[];
  /** Files picked on the device, not yet uploaded. Never sent as URLs. */
  newPhotos: LocalPhoto[];
}

export const EMPTY_LISTING_FORM: ListingFormValues = {
  title: '',
  roomType: 'phong-tro',
  rent: '',
  area: '',
  houseNumber: '',
  alley: '',
  street: '',
  ward: '',
  district: '',
  city: 'TP Hồ Chí Minh',
  depositMonths: '1',
  electricity: '',
  water: '',
  internet: '',
  sanitation: '',
  parkingBike: '',
  managementFee: '',
  direction: '',
  floor: '',
  totalFloors: '',
  availableFrom: '',
  vacantNow: true,
  furniture: false,
  pets: false,
  amenities: [],
  photos: [],
  newPhotos: [],
};

export type ListingFormErrors = Partial<Record<keyof ListingFormValues, string>>;

export interface ListingFormProps {
  values: ListingFormValues;
  onChange: (next: ListingFormValues) => void;
  errors: ListingFormErrors;
  /** Label of the submit button. */
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  /** Shown above the fields when the last submit failed. */
  formError?: string | null;
  /** Extra content rendered above the submit button (e.g. a notice). */
  footerNote?: React.ReactNode;
  /** Opens the photo library so the seller can pick more images. */
  onPickPhotos: () => void;
  /** Removes a photo that is already stored on the server. */
  onRemovePhoto: (url: string) => void;
  /** Removes a file that was just picked on the device. */
  onRemoveNewPhoto: (uri: string) => void;
  /** True while the picked files are being uploaded. */
  isUploadingPhotos?: boolean;
  /** The last photo error, or `null`. */
  photoError?: string | null;
}

/** Parse an optional non-negative number, or `undefined` when blank. */
function optionalNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed.replace(/[.,\s]/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

/** Parse an optional non-negative integer. */
function optionalInt(raw: string): number | undefined {
  const value = optionalNumber(raw);
  return value === undefined ? undefined : Math.trunc(value);
}

/**
 * Validate the form.
 *
 * Only the rules the backend enforces (plus the obvious numeric sanity
 * checks) are applied here — the backend stays the authority.
 */
export function validateListingForm(values: ListingFormValues): ListingFormErrors {
  const errors: ListingFormErrors = {};

  if (!values.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề tin đăng.';
  } else if (values.title.trim().length < 10) {
    errors.title = 'Tiêu đề nên có ít nhất 10 ký tự.';
  }

  const rent = optionalNumber(values.rent);
  if (rent === undefined) {
    errors.rent = 'Vui lòng nhập giá thuê.';
  } else if (rent <= 0) {
    errors.rent = 'Giá thuê phải lớn hơn 0.';
  } else if (rent > 1_000_000_000) {
    errors.rent = 'Giá thuê không hợp lệ.';
  }

  if (values.area.trim()) {
    const area = optionalNumber(values.area);
    if (area === undefined || area <= 0) {
      errors.area = 'Diện tích phải là số lớn hơn 0.';
    } else if (area > 10000) {
      errors.area = 'Diện tích không hợp lệ.';
    }
  }

  if (!values.district.trim()) {
    errors.district = 'Vui lòng nhập quận/huyện.';
  }
  if (!values.street.trim()) {
    errors.street = 'Vui lòng nhập tên đường.';
  }

  const numericFields: Array<keyof ListingFormValues> = [
    'depositMonths',
    'electricity',
    'water',
    'internet',
    'sanitation',
    'parkingBike',
    'managementFee',
    'floor',
    'totalFloors',
  ];
  for (const field of numericFields) {
    const raw = String(values[field] ?? '').trim();
    if (!raw) continue;
    const parsed = optionalNumber(raw);
    if (parsed === undefined || parsed < 0) {
      errors[field] = 'Giá trị phải là số không âm.';
    }
  }

  if (values.availableFrom.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(values.availableFrom.trim())) {
    errors.availableFrom = 'Ngày phải có dạng YYYY-MM-DD.';
  }

  return errors;
}

/** Build the API payload from the form state. */
export function listingFormToPayload(values: ListingFormValues) {
  const rent = optionalNumber(values.rent) ?? 0;

  return {
    title: values.title.trim(),
    roomType: values.roomType,
    rent,
    city: values.city.trim() || undefined,
    district: values.district.trim() || undefined,
    ward: values.ward.trim() || undefined,
    street: values.street.trim() || undefined,
    houseNumber: values.houseNumber.trim() || undefined,
    alley: values.alley.trim() || undefined,
    depositMonths: optionalInt(values.depositMonths) ?? 1,
    electricity: optionalNumber(values.electricity),
    water: optionalNumber(values.water),
    internet: optionalNumber(values.internet),
    sanitation: optionalNumber(values.sanitation),
    parkingBike: optionalNumber(values.parkingBike),
    managementFee: optionalNumber(values.managementFee),
    area: optionalNumber(values.area),
    direction: values.direction || undefined,
    floor: optionalInt(values.floor),
    totalFloors: optionalInt(values.totalFloors),
    furniture: values.furniture,
    pets: values.pets,
    vacantNow: values.vacantNow,
    availableFrom: values.vacantNow ? null : values.availableFrom.trim() || null,
    photos: values.photos,
    amenities: values.amenities,
  };
}

export function ListingForm({
  values,
  onChange,
  errors,
  submitLabel,
  submitting,
  onSubmit,
  formError,
  footerNote,
  onPickPhotos,
  onRemovePhoto,
  onRemoveNewPhoto,
  isUploadingPhotos = false,
  photoError = null,
}: ListingFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) => {
    onChange({ ...values, [key]: value });
  };

  const toggleAmenity = (amenity: string) => {
    const next = values.amenities.includes(amenity)
      ? values.amenities.filter((item) => item !== amenity)
      : [...values.amenities, amenity];
    set('amenities', next);
  };

  /** How many slots are in use — stored photos plus the freshly picked ones. */
  const photoCount = values.photos.length + values.newPhotos.length;
  /** The empty slots rendered with a "+" — always at least one. */
  const emptySlots = Math.max(1, Math.min(4, MAX_LISTING_PHOTOS - photoCount));

  return (
    <View style={styles.root}>
      {formError ? (
        <View style={styles.formError}>
          <Text style={[styles.formErrorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
        </View>
      ) : null}

      <AppCard>
        <SectionLabel label="Thông tin cơ bản" />

        <AppInput
          label="Tiêu đề tin đăng *"
          placeholder="VD: Phòng trọ mới xây, gần ĐH Bách Khoa"
          value={values.title}
          onChangeText={(text) => set('title', text)}
          error={errors.title}
          maxLength={120}
          autoCapitalize="sentences"
        />

        <Text style={[styles.fieldLabel, { fontFamily: fontFamily.semibold }]}>Loại phòng *</Text>
        <View style={styles.chipRow}>
          {ROOM_TYPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.key}
              label={option.label}
              selected={values.roomType === option.key}
              onPress={() => set('roomType', option.key)}
            />
          ))}
        </View>

        <AppInput
          label="Giá thuê (đ/tháng) *"
          placeholder="VD: 4500000"
          value={values.rent}
          onChangeText={(text) => set('rent', text)}
          error={errors.rent}
          keyboardType="number-pad"
        />

        <AppInput
          label="Diện tích (m²)"
          placeholder="VD: 22"
          value={values.area}
          onChangeText={(text) => set('area', text)}
          error={errors.area}
          keyboardType="decimal-pad"
        />

        <AppInput
          label="Số tháng cọc"
          placeholder="VD: 1"
          value={values.depositMonths}
          onChangeText={(text) => set('depositMonths', text)}
          error={errors.depositMonths}
          keyboardType="number-pad"
        />
      </AppCard>

      <AppCard style={styles.card}>
        <SectionLabel label="Địa chỉ" />

        <AppInput
          label="Số nhà"
          placeholder="VD: 12/3"
          value={values.houseNumber}
          onChangeText={(text) => set('houseNumber', text)}
        />

        <AppInput
          label="Hẻm / ngõ"
          placeholder="VD: Hẻm 45"
          value={values.alley}
          onChangeText={(text) => set('alley', text)}
        />

        <AppInput
          label="Tên đường *"
          placeholder="VD: Lý Thường Kiệt"
          value={values.street}
          onChangeText={(text) => set('street', text)}
          error={errors.street}
        />

        <AppInput
          label="Phường / xã"
          placeholder="VD: Phường 7"
          value={values.ward}
          onChangeText={(text) => set('ward', text)}
        />

        <AppInput
          label="Quận / huyện *"
          placeholder="VD: Quận 10"
          value={values.district}
          onChangeText={(text) => set('district', text)}
          error={errors.district}
        />

        <AppInput
          label="Tỉnh / thành phố"
          value={values.city}
          onChangeText={(text) => set('city', text)}
          containerStyle={styles.lastField}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <SectionLabel label="Chi phí hàng tháng" />

        <AppInput
          label="Tiền điện (đ)"
          placeholder="VD: 3500"
          value={values.electricity}
          onChangeText={(text) => set('electricity', text)}
          error={errors.electricity}
          keyboardType="number-pad"
        />

        <AppInput
          label="Tiền nước (đ)"
          placeholder="VD: 100000"
          value={values.water}
          onChangeText={(text) => set('water', text)}
          error={errors.water}
          keyboardType="number-pad"
        />

        <AppInput
          label="Internet (đ)"
          placeholder="VD: 100000"
          value={values.internet}
          onChangeText={(text) => set('internet', text)}
          error={errors.internet}
          keyboardType="number-pad"
        />

        <AppInput
          label="Phí rác / quản lý (đ)"
          placeholder="VD: 50000"
          value={values.managementFee}
          onChangeText={(text) => set('managementFee', text)}
          error={errors.managementFee}
          keyboardType="number-pad"
          containerStyle={styles.lastField}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <SectionLabel label="Tiện ích" />

        <View style={styles.chipRow}>
          {AMENITY_OPTIONS.map((amenity) => (
            <FilterChip
              key={amenity}
              label={amenity}
              selected={values.amenities.includes(amenity)}
              onPress={() => toggleAmenity(amenity)}
            />
          ))}
        </View>

        <View style={styles.toggleRow}>
          <ToggleChip
            label="Có nội thất"
            selected={values.furniture}
            onPress={() => set('furniture', !values.furniture)}
          />
          <ToggleChip
            label="Cho nuôi thú cưng"
            selected={values.pets}
            onPress={() => set('pets', !values.pets)}
          />
          <ToggleChip
            label="Đang trống"
            selected={values.vacantNow}
            onPress={() => set('vacantNow', !values.vacantNow)}
          />
        </View>
      </AppCard>

      <AppCard style={styles.card}>
        <View style={styles.photoHeader}>
          <Text style={[styles.sectionLabel, styles.photoSectionLabel, { fontFamily: fontFamily.extrabold }]}>
            ẢNH PHÒNG
          </Text>
          <Text style={[styles.photoCount, { fontFamily: fontFamily.bold }]}>
            {photoCount}/{MAX_LISTING_PHOTOS}
          </Text>
        </View>

        {/* --- The grid: stored photos, picked photos, then empty slots --- */}
        <View style={styles.photoGrid}>
          {values.photos.map((url, index) => (
            <View key={`stored-${url}`} style={styles.photoWrap}>
              <Image
                source={{ uri: resolveMediaUrl(url) ?? url }}
                style={styles.photo}
                resizeMode="cover"
              />
              {index === 0 ? (
                <View style={styles.photoCoverBadge}>
                  <Text style={[styles.photoCoverText, { fontFamily: fontFamily.bold }]}>ẢNH BÌA</Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => onRemovePhoto(url)}
                accessibilityRole="button"
                accessibilityLabel="Xóa ảnh"
                hitSlop={6}
                style={styles.photoRemove}
              >
                <X size={12} color={colors.surface} strokeWidth={3} />
              </Pressable>
            </View>
          ))}

          {values.newPhotos.map((photo) => (
            <View key={`new-${photo.uri}`} style={styles.photoWrap}>
              <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
              <View style={styles.photoNewBadge}>
                <Text style={[styles.photoNewText, { fontFamily: fontFamily.bold }]}>MỚI</Text>
              </View>
              <Pressable
                onPress={() => onRemoveNewPhoto(photo.uri)}
                accessibilityRole="button"
                accessibilityLabel="Xóa ảnh"
                hitSlop={6}
                style={styles.photoRemove}
              >
                <X size={12} color={colors.surface} strokeWidth={3} />
              </Pressable>
            </View>
          ))}

          {/* Empty slots carry a "+" and open the photo library. */}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <Pressable
              key={`empty-${index}`}
              onPress={onPickPhotos}
              disabled={isUploadingPhotos}
              accessibilityRole="button"
              accessibilityLabel="Thêm ảnh từ thư viện"
              style={({ pressed }) => [
                styles.photoSlot,
                pressed ? styles.photoSlotPressed : null,
                isUploadingPhotos ? styles.photoSlotDisabled : null,
              ]}
            >
              {isUploadingPhotos ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <ImagePlus size={18} color={colors.ink} strokeWidth={2.8} />
              )}
            </Pressable>
          ))}
        </View>

        {photoError ? (
          <View style={styles.photoError}>
            <Text style={[styles.photoErrorText, { fontFamily: fontFamily.medium }]}>{photoError}</Text>
          </View>
        ) : null}

        <AppButton
          label={
            isUploadingPhotos
              ? 'Đang tải ảnh…'
              : photoCount >= MAX_LISTING_PHOTOS
                ? 'Đã đủ 12 ảnh'
                : `Thêm ảnh từ thư viện (${photoCount}/${MAX_LISTING_PHOTOS})`
          }
          variant="secondary"
          size="sm"
          fullWidth
          disabled={isUploadingPhotos || photoCount >= MAX_LISTING_PHOTOS}
          onPress={onPickPhotos}
          style={styles.photoButton}
          trailingIcon={<ImagePlus size={15} color={colors.ink} strokeWidth={2.8} />}
        />

        {isUploadingPhotos ? (
          <View style={styles.uploadingRow}>
            <Loader2 size={13} color={colors.textMuted} strokeWidth={2.6} />
            <Text style={[styles.uploadingText, { fontFamily: fontFamily.regular }]}>
              Đang tải ảnh lên máy chủ, vui lòng không đóng ứng dụng.
            </Text>
          </View>
        ) : null}
      </AppCard>

      <Pressable
        onPress={() => setShowAdvanced((current) => !current)}
        accessibilityRole="button"
        style={styles.advancedToggle}
      >
        <Text style={[styles.advancedToggleText, { fontFamily: fontFamily.bold }]}>
          {showAdvanced ? 'Ẩn thông tin thêm' : 'Thông tin thêm'}
        </Text>
      </Pressable>

      {showAdvanced ? (
        <AppCard style={styles.card}>
          <SectionLabel label="Chi tiết khác" />

          <Text style={[styles.fieldLabel, { fontFamily: fontFamily.semibold }]}>Hướng</Text>
          <View style={styles.chipRow}>
            {DIRECTION_OPTIONS.map((option) => (
              <FilterChip
                key={option.key}
                label={option.label}
                selected={values.direction === option.key}
                onPress={() =>
                  set('direction', values.direction === option.key ? '' : option.key)
                }
              />
            ))}
          </View>

          <AppInput
            label="Tầng"
            placeholder="VD: 2"
            value={values.floor}
            onChangeText={(text) => set('floor', text)}
            error={errors.floor}
            keyboardType="number-pad"
          />

          <AppInput
            label="Tổng số tầng"
            placeholder="VD: 4"
            value={values.totalFloors}
            onChangeText={(text) => set('totalFloors', text)}
            error={errors.totalFloors}
            keyboardType="number-pad"
          />

          <AppInput
            label="Có thể vào từ ngày (YYYY-MM-DD)"
            placeholder="2026-11-01"
            value={values.availableFrom}
            onChangeText={(text) => set('availableFrom', text)}
            error={errors.availableFrom}
            hint={values.vacantNow ? 'Tin đang đánh dấu "Đang trống" nên ngày này không được gửi.' : undefined}
            containerStyle={styles.lastField}
          />
        </AppCard>
      ) : null}

      {footerNote}

      <AppButton
        label={submitLabel}
        onPress={onSubmit}
        loading={submitting}
        disabled={submitting}
        fullWidth
        size="lg"
        showAccentMark
        style={styles.submit}
      />
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>{label}</Text>;
}

function ToggleChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.toggle,
        { backgroundColor: selected ? colors.primary : colors.surface },
        pressed ? styles.togglePressed : null,
      ]}
    >
      <Text style={[styles.toggleText, { fontFamily: selected ? fontFamily.bold : fontFamily.medium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  card: {
    marginTop: 0,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  lastField: {
    marginBottom: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
  },
  togglePressed: {
    opacity: 0.75,
  },
  toggleText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** An empty slot — a dashed "+" tile that opens the photo library. */
  photoSlot: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderStyle: 'dashed',
    borderColor: colors.ink,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotPressed: {
    opacity: 0.7,
  },
  photoSlotDisabled: {
    opacity: 0.5,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  photoSectionLabel: {
    marginBottom: 0,
  },
  photoCount: {
    fontSize: fontSize.sm,
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  photoCoverBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.ink,
  },
  photoCoverText: {
    fontSize: 7,
    color: colors.surface,
    letterSpacing: 0.4,
  },
  photoNewBadge: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: colors.info,
  },
  photoNewText: {
    fontSize: 7,
    color: colors.surface,
    letterSpacing: 0.4,
  },
  photoError: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  photoErrorText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    lineHeight: 17,
  },
  photoButton: {
    marginTop: spacing.xs,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  uploadingText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
  },
  uploadNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.borderMuted,
    backgroundColor: colors.background,
  },
  uploadNoticeText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },
  advancedToggle: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  advancedToggleText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  formError: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  formErrorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  submit: {
    marginTop: spacing.sm,
  },
});
