/**
 * SCENE 028 — Edit Seller Profile (Chỉnh sửa hồ sơ).
 *
 * Writes to `PUT /api/seller/profile`, which accepts exactly:
 *
 *   idNumber · brand · address · docs
 *
 * The endpoint upserts the row and resets `status` to `pending` with a new
 * `submittedAt` — every save is a re-submission for review. The screen says
 * so before the seller presses save; it never claims the change is live.
 *
 * The display name is saved separately through `PUT /api/auth/profile`
 * (`fullName` only). Phone and e-mail are read-only here: changing an
 * e-mail requires the OTP flow that lives on the website.
 *
 * The role and the verification status are never sent by this screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Info, ShieldAlert } from 'lucide-react-native';

import { AppButton, AppCard, AppHeader, AppInput, LoadingState } from '@/components/ui';
import { useAsyncData } from '@/hooks/use-async-data';
import { ApiError, authApi, sellerApi } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';
import type { SellerProfile } from '@/types/seller';

const PROFILE_ROUTE = '/(seller)/(tabs)/tai-khoan-chu-tro';

interface FieldErrors {
  fullName?: string;
  idNumber?: string;
  address?: string;
}

export default function EditSellerProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [brand, setBrand] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const inFlight = useRef(false);

  const fetcher = useCallback(async (): Promise<SellerProfile | null> => {
    try {
      const response = await sellerApi.profile();
      return response.profile;
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) return null;
      throw caught;
    }
  }, []);

  const { data: profile, isLoading } = useAsyncData<SellerProfile | null>(fetcher, []);

  // Fill the form once, from either source.
  useEffect(() => {
    if (hydrated) return;
    if (!profile && !user) return;

    setFullName((current) => current || profile?.user?.fullName || user?.fullName || '');
    setBrand((current) => current || profile?.brand || '');
    setIdNumber((current) => current || profile?.idNumber || '');
    setAddress((current) => current || profile?.address || '');
    setHydrated(true);
  }, [hydrated, profile, user]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(PROFILE_ROUTE as never);
    }
  }, [router]);

  const handleSave = useCallback(async () => {
    if (inFlight.current) return;

    const nextErrors: FieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedId = idNumber.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) nextErrors.fullName = 'Họ tên không được để trống.';

    if (trimmedId) {
      if (!/^\d{12}$/.test(trimmedId)) {
        nextErrors.idNumber = 'CCCD phải gồm đúng 12 chữ số.';
      }
    } else {
      nextErrors.idNumber = 'Vui lòng nhập số CCCD.';
    }

    if (!trimmedAddress) {
      nextErrors.address = 'Vui lòng nhập địa chỉ thường trú.';
    } else if (trimmedAddress.length < 10) {
      nextErrors.address = 'Địa chỉ phải có ít nhất 10 ký tự.';
    }

    setErrors(nextErrors);
    setFormError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      setFormError('Vui lòng kiểm tra lại các trường được đánh dấu.');
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    try {
      // The account name is a different endpoint — only send it if it moved.
      if (trimmedName !== (user?.fullName ?? '')) {
        await authApi.updateProfile({ fullName: trimmedName });
      }

      const result = await sellerApi.updateProfile({
        idNumber: trimmedId,
        brand: brand.trim() || undefined,
        address: trimmedAddress,
      });

      // The backend answers with the profile it just re-submitted.
      setSuccessMessage(
        `${result.message} Hồ sơ đang chờ ban quản lý duyệt lại.`,
      );

      // Keep the session's copy of the name in sync.
      await refresh();

      setTimeout(() => {
        router.replace(PROFILE_ROUTE as never);
      }, 1100);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Không lưu được hồ sơ. Vui lòng thử lại.',
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [address, brand, fullName, idNumber, refresh, router, user?.fullName]);

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top }}>
          <AppHeader
            title="Chỉnh sửa hồ sơ"
            subtitle="Thông tin chủ trọ và liên hệ"
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

        {isLoading ? (
          <LoadingState message="Đang tải hồ sơ…" />
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.notice}>
              <ShieldAlert size={16} color={colors.warning} strokeWidth={2.5} />
              <Text style={[styles.noticeText, { fontFamily: fontFamily.regular }]}>
                Mỗi lần lưu, hồ sơ được gửi lại để ban quản lý duyệt và trạng thái xác minh trở về
                “Đang chờ duyệt”.
              </Text>
            </View>

            {successMessage ? (
              <View style={styles.successBanner}>
                <Text style={[styles.successText, { fontFamily: fontFamily.semibold }]}>
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {formError ? (
              <View style={styles.errorBanner}>
                <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
              </View>
            ) : null}

            <AppCard>
              <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>
                THÔNG TIN LIÊN HỆ
              </Text>

              <AppInput
                label="Họ và tên *"
                value={fullName}
                onChangeText={setFullName}
                error={errors.fullName}
                autoCapitalize="words"
              />

              <AppInput
                label="Số điện thoại"
                value={user?.phone ?? ''}
                editable={false}
                hint="Số điện thoại đăng nhập không thể đổi trong ứng dụng."
                containerStyle={styles.lastField}
              />

              <AppInput
                label="Email"
                value={user?.email ?? ''}
                editable={false}
                hint="Đổi email cần xác thực OTP và được thực hiện trên website."
                containerStyle={styles.fieldSpacing}
              />
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={[styles.sectionLabel, { fontFamily: fontFamily.extrabold }]}>
                THÔNG TIN CHỦ TRỌ
              </Text>

              <AppInput
                label="Tên thương hiệu / nhà trọ"
                placeholder="VD: Nhà trọ Minh Anh"
                value={brand}
                onChangeText={setBrand}
                hint="Không bắt buộc — hiển thị công khai nếu có."
              />

              <AppInput
                label="Số CCCD (12 số) *"
                placeholder="012345678901"
                value={idNumber}
                onChangeText={(text) => setIdNumber(text.replace(/[^\d]/g, ''))}
                error={errors.idNumber}
                keyboardType="number-pad"
                maxLength={12}
              />

              <AppInput
                label="Địa chỉ thường trú *"
                placeholder="Số nhà, đường, phường, quận, tỉnh"
                value={address}
                onChangeText={setAddress}
                error={errors.address}
                multiline
                numberOfLines={3}
                style={styles.multiline}
                containerStyle={styles.lastField}
              />
            </AppCard>

            <AppButton
              label="Lưu hồ sơ"
              onPress={handleSave}
              loading={submitting}
              disabled={submitting || successMessage !== null}
              fullWidth
              size="lg"
              showAccentMark
              style={styles.submit}
            />

            <Text style={[styles.footer, { fontFamily: fontFamily.regular }]}>
              <Info size={12} color={colors.textSubtle} strokeWidth={2.5} /> Trạng thái xác minh và
              vai trò tài khoản do ban quản lý quyết định.
            </Text>
          </ScrollView>
        )}
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
    borderColor: colors.warning,
    backgroundColor: colors.warningSurface,
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
  errorBanner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.danger,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  card: {
    marginTop: spacing.lg,
  },
  fieldSpacing: {
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  lastField: {
    marginBottom: 0,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: spacing.xl,
  },
  footer: {
    marginTop: spacing.lg,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },
});
