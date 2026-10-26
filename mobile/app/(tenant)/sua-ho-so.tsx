/**
 * SCENE 018 — Edit profile.
 *
 * The screen where a tenant changes their name or their e-mail address.
 *
 * The backend treats the two fields differently:
 *   - the name is saved straight away;
 *   - a NEW e-mail address is not saved — the backend e-mails a code to
 *     it first and only changes the address once the code is proven.
 *
 * The screen therefore shows two states after a successful save: "done"
 * for a name change, and "awaiting confirmation" for an e-mail change.
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
import { ArrowLeft, CheckCircle2, Mail, ShieldCheck, User as UserIcon } from 'lucide-react-native';

import { AppButton, AppInput } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The profile screen the visitor came from (SCENE 017). */
const PROFILE_ROUTE = '/(tenant)/(tabs)/tai-khoan';

interface FieldErrors {
  fullName?: string;
  email?: string;
}

/** Turn an API failure into a message the visitor can act on. */
function describeUpdateError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 400) {
      return error.message || 'Dữ liệu không hợp lệ.';
    }
    if (error.status === 409) {
      return 'Email này đã được sử dụng bởi tài khoản khác.';
    }
    if (error.status === 429) {
      return 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.';
    }
    if (error.status === 503) {
      return 'Không gửi được mã xác thực. Vui lòng thử lại sau.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }

    return error.message;
  }

  return 'Cập nhật thất bại. Vui lòng thử lại.';
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refresh } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Set when the backend asks for an e-mail confirmation. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(PROFILE_ROUTE as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!trimmedName) {
      errors.fullName = 'Vui lòng nhập họ và tên.';
    }
    if (!trimmedEmail) {
      errors.email = 'Vui lòng nhập email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Email không hợp lệ.';
    }

    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await authApi.updateProfile({
        fullName: trimmedName,
        email: trimmedEmail,
      });

      if (result.requiresEmailConfirmation) {
        // The address only changes once the code is proven.
        setPendingEmail(result.pendingEmail ?? trimmedEmail);
      } else {
        setSaved(true);
      }

      // The session carries the name, so it is re-read from the backend.
      await refresh();
    } catch (error) {
      setFormError(describeUpdateError(error));
    } finally {
      setSubmitting(false);
    }
  }, [email, fullName, refresh, submitting]);

  // ---------------------------------------------------------------------
  // Success — the e-mail still has to be proven.
  // ---------------------------------------------------------------------
  if (pendingEmail) {
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
            <Mail size={44} color={colors.ink} strokeWidth={2.6} />
          </View>

          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>ĐÃ GỬI MÃ XÁC THỰC</Text>
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
            Mã xác thực đã được gửi tới {pendingEmail}. Email của bạn chỉ được đổi sau khi
            nhập đúng mã.
          </Text>

          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <ShieldCheck size={18} color={colors.ink} strokeWidth={2.5} />
            </View>
            <Text style={[styles.noticeText, { fontFamily: fontFamily.medium }]}>
              {pendingEmail}
            </Text>
          </View>

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

  // ---------------------------------------------------------------------
  // Success — everything is saved.
  // ---------------------------------------------------------------------
  if (saved) {
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
            <CheckCircle2 size={48} color={colors.ink} strokeWidth={2.6} />
          </View>

          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>CẬP NHẬT THÀNH CÔNG</Text>
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
            Hồ sơ của bạn đã được lưu.
          </Text>

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

        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>SỬA HỒ SƠ</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Cập nhật tên và email của bạn. Số điện thoại không thay đổi được.
        </Text>

        {/* --- Form ---------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Họ và tên"
            placeholder="Nhập họ và tên"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (fieldErrors.fullName) {
                setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
              }
            }}
            error={fieldErrors.fullName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            editable={!submitting}
            leftSlot={<UserIcon size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            hint="Đổi email sẽ yêu cầu xác thực bằng mã gửi tới địa chỉ mới."
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!submitting}
            leftSlot={<Mail size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            label="Số điện thoại"
            placeholder="Số điện thoại đã đăng ký"
            value={user?.phone ?? ''}
            editable={false}
            hint="Số điện thoại là định danh tài khoản và không thể thay đổi."
            leftSlot={<UserIcon size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          <AppButton
            label="Lưu thay đổi"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            showAccentMark={!submitting}
          />
        </View>
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
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
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

  form: {
    marginTop: spacing.xxl,
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
  noticeText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  bottomAction: {
    marginTop: spacing.xxl,
  },
});
