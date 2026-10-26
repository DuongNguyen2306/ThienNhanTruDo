/**
 * SCENE 019 — Request to become a landlord.
 *
 * The screen where a tenant applies to publish listings. The application
 * needs the national ID number and the permanent address; the backend
 * queues it for a manager to review.
 *
 * The screen reads the current state first (`GET /api/auth/seller-application`)
 * so it can show one of three things:
 *   - the form, when no application exists;
 *   - the pending state, when one is waiting for review;
 *   - the rejection notice, when the last one was turned down.
 */

import { useCallback, useState } from 'react';
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
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  ShieldCheck,
} from 'lucide-react-native';

import { AppButton, AppInput, ErrorState, LoadingState, StatusBadge } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { useAsyncData } from '@/hooks/use-async-data';
import { formatDate } from '@/lib/format';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';
import type { SellerApplicationStatus } from '@/types/listing';

/** The profile screen the visitor came from (SCENE 017). */
const PROFILE_ROUTE = '/(tenant)/(tabs)/tai-khoan';

interface FieldErrors {
  idNumber?: string;
  permanentAddress?: string;
}

/** Turn an API failure into a message the visitor can act on. */
function describeApplyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 400) {
      return error.message || 'Dữ liệu không hợp lệ.';
    }
    if (error.status === 403) {
      return 'Chỉ người thuê mới có thể đăng ký làm chủ trọ.';
    }
    if (error.status === 409) {
      return error.message || 'Hồ sơ của bạn đang được xét duyệt.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }

    return error.message;
  }

  return 'Gửi hồ sơ thất bại. Vui lòng thử lại.';
}

export default function ApplySellerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [idNumber, setIdNumber] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Set after the application was accepted by the backend. */
  const [submitted, setSubmitted] = useState(false);

  const fetcher = useCallback(() => authApi.getSellerApplication(), []);
  const {
    data: application,
    isLoading,
    error,
    reload,
  } = useAsyncData<SellerApplicationStatus>(fetcher, []);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(PROFILE_ROUTE as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const trimmedId = idNumber.replace(/\s/g, '');
    const trimmedAddress = permanentAddress.trim();
    const errors: FieldErrors = {};

    if (!trimmedId) {
      errors.idNumber = 'Vui lòng nhập số CCCD.';
    } else if (!/^\d{12}$/.test(trimmedId)) {
      errors.idNumber = 'Số CCCD phải đủ 12 chữ số.';
    }

    if (!trimmedAddress) {
      errors.permanentAddress = 'Vui lòng nhập địa chỉ thường trú.';
    } else if (trimmedAddress.length < 10) {
      errors.permanentAddress = 'Địa chỉ thường trú phải có ít nhất 10 ký tự.';
    }

    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await authApi.applySeller({
        idNumber: trimmedId,
        permanentAddress: trimmedAddress,
      });
      setSubmitted(true);
    } catch (caught) {
      setFormError(describeApplyError(caught));
    } finally {
      setSubmitting(false);
    }
  }, [idNumber, permanentAddress, submitting]);

  if (isLoading) {
    return <LoadingState fullScreen message="Đang kiểm tra hồ sơ…" />;
  }

  if (error) {
    return (
      <View style={styles.flex}>
        <View style={[styles.backRow, { paddingTop: insets.top + spacing.md }]}>
          <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Quay lại">
            <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
          </Pressable>
        </View>
        <ErrorState
          title="Không tải được hồ sơ"
          message={error}
          onRetry={reload}
          onBack={goBack}
        />
      </View>
    );
  }

  const status = application?.status ?? 'none';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isActive = status === 'active';

  // ---------------------------------------------------------------------
  // Submitted in this session.
  // ---------------------------------------------------------------------
  if (submitted || isPending || isActive) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.huge },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.tickBox}>
            {isActive ? (
              <BadgeCheck size={48} color={colors.ink} strokeWidth={2.6} />
            ) : (
              <CheckCircle2 size={48} color={colors.ink} strokeWidth={2.6} />
            )}
          </View>

          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>
            {isActive ? 'BẠN ĐÃ LÀ CHỦ TRỌ' : 'HỒ SƠ ĐÃ ĐƯỢC GỬI'}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
            {isActive
              ? 'Tài khoản của bạn đã được nâng quyền. Bạn có thể đăng tin ngay bây giờ.'
              : 'Ban quản lý sẽ xét duyệt hồ sơ của bạn. Trạng thái sẽ được cập nhật trong tài khoản.'}
          </Text>

          {application?.submittedAt ? (
            <View style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Clock size={18} color={colors.ink} strokeWidth={2.5} />
              </View>
              <View style={styles.noticeTextBlock}>
                <Text style={[styles.noticeLabel, { fontFamily: fontFamily.medium }]}>Ngày gửi</Text>
                <Text style={[styles.noticeValue, { fontFamily: fontFamily.bold }]}>
                  {formatDate(application.submittedAt)}
                </Text>
              </View>
            </View>
          ) : null}

          <AppButton
            label="Quay lại hồ sơ"
            size="lg"
            fullWidth
            onPress={goBack}
            showAccentMark
            style={styles.bottomAction}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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

        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>ĐĂNG KÝ LÀM CHỦ TRỌ</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Gửi hồ sơ để được đăng tin đăng phòng trên THIÊN NHÃN TRÚ ĐỒ.
        </Text>

        {/* --- Rejected notice ------------------------------------------- */}
        {isRejected ? (
          <View style={styles.rejectedBanner}>
            <Text style={[styles.rejectedTitle, { fontFamily: fontFamily.bold }]}>
              Hồ sơ trước đã bị từ chối
            </Text>
            <Text style={[styles.rejectedText, { fontFamily: fontFamily.regular }]}>
              {application?.reviewNote ?? 'Vui lòng kiểm tra lại thông tin và gửi lại hồ sơ.'}
            </Text>
          </View>
        ) : null}

        {/* --- What the landlord gets ------------------------------------ */}
        <View style={styles.benefitsCard}>
          <BenefitRow
            icon={FileText}
            title="Đăng tin không giới hạn"
            text="Tự tạo và quản lý tin đăng phòng của bạn."
          />
          <View style={styles.divider} />
          <BenefitRow
            icon={BadgeCheck}
            title="Huy hiệu đã xác minh"
            text="Tin của bạn được ưu tiên hiển thị sau khi ban quản lý duyệt."
          />
          <View style={styles.divider} />
          <BenefitRow
            icon={ShieldCheck}
            title="Quản lý minh bạch"
            text="Bảng giá điện nước cọc rõ ràng, không phí ẩn."
          />
        </View>

        {/* --- Form ----------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Số CCCD"
            placeholder="012345678901"
            value={idNumber}
            onChangeText={(text) => {
              setIdNumber(text);
              if (fieldErrors.idNumber) {
                setFieldErrors((prev) => ({ ...prev, idNumber: undefined }));
              }
            }}
            error={fieldErrors.idNumber}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={12}
            editable={!submitting}
            leftSlot={<FileText size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            label="Địa chỉ thường trú"
            placeholder="Số nhà, đường, phường, quận, tỉnh/thành"
            value={permanentAddress}
            onChangeText={(text) => {
              setPermanentAddress(text);
              if (fieldErrors.permanentAddress) {
                setFieldErrors((prev) => ({ ...prev, permanentAddress: undefined }));
              }
            }}
            error={fieldErrors.permanentAddress}
            multiline
            numberOfLines={3}
            style={styles.addressInput}
            editable={!submitting}
            leftSlot={<MapPin size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          <AppButton
            label="Gửi hồ sơ đăng ký"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            showAccentMark={!submitting}
          />
        </View>

        {/* --- Status note ----------------------------------------------- */}
        {application?.hasApplied ? (
          <View style={styles.statusNote}>
            <StatusBadge label="Đã có hồ sơ" variant="neutral" />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function BenefitRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof FileText;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>
        <Icon size={18} color={colors.ink} strokeWidth={2.6} />
      </View>
      <View style={styles.benefitText}>
        <Text style={[styles.benefitTitle, { fontFamily: fontFamily.bold }]}>{title}</Text>
        <Text style={[styles.benefitBody, { fontFamily: fontFamily.regular }]}>{text}</Text>
      </View>
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

  rejectedBanner: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  rejectedTitle: {
    fontSize: fontSize.md,
    color: colors.danger,
  },
  rejectedText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.danger,
  },

  benefitsCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  benefitBody: {
    marginTop: 2,
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    backgroundColor: colors.borderMuted,
  },

  form: {
    marginTop: spacing.xl,
  },
  addressInput: {
    minHeight: 84,
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

  tickBox: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: borderWidth.lg,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.sm,
  },
  noticeIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  noticeTextBlock: {
    flex: 1,
  },
  noticeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  noticeValue: {
    marginTop: 2,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  bottomAction: {
    marginTop: spacing.xxl,
  },

  statusNote: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
});
