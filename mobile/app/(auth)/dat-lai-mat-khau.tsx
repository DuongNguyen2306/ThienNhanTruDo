/**
 * SCENE 007 — Reset password.
 *
 * The second half of the password-reset flow. The visitor types the
 * six-digit code that was e-mailed to them, then a new password twice.
 *
 * Layout, top to bottom:
 *
 *   1. the back button
 *   2. the headline "ĐẶT LẠI MẬT KHẨU" and a short line
 *   3. the e-mail the code was sent to
 *   4. the six-box code field
 *   5. the new-password field, with the show/hide toggle
 *   6. the confirm-password field, with the show/hide toggle
 *   7. the yellow "Đặt lại mật khẩu" button
 *
 * The backend invalidates every other session once the password changes,
 * so the visitor is sent back to the sign-in screen afterwards.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react-native';

import { AppButton, AppInput, OtpInput } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The sign-in screen — the visitor lands there after a successful reset. */
const SIGN_IN_ROUTE = '/(auth)/dang-nhap';

/** The screen that asks for the e-mail (SCENE 006). */
const FORGOT_ROUTE = '/(auth)/quen-mat-khau';

/** The minimum length of a password accepted by the backend. */
const PASSWORD_MIN_LENGTH = 8;

interface FieldErrors {
  email?: string;
  otp?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Validate a password.
 *
 * The backend requires at least 8 characters, at least one upper-case
 * letter and at least one digit. The same three rules are applied here so
 * the visitor is told what is missing before a request is sent.
 */
function validatePassword(value: string): string | undefined {
  if (!value) {
    return 'Vui lòng nhập mật khẩu mới.';
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự.`;
  }
  if (!/[A-Z]/.test(value)) {
    return 'Mật khẩu phải có chữ hoa.';
  }
  if (!/\d/.test(value)) {
    return 'Mật khẩu phải có chữ số.';
  }
  return undefined;
}

/** Turn an API failure into a message the visitor can act on. */
function describeResetError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 400) {
      // The backend reports every OTP problem with a precise Vietnamese
      // message (expired, consumed, wrong, too many attempts).
      return error.message || 'Mã xác thực không hợp lệ.';
    }
    if (error.status === 429) {
      return 'Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.';
    }
    if (error.status === 408) {
      return 'Yêu cầu hết thời gian. Vui lòng thử lại.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }

    return error.message;
  }

  return 'Đặt lại mật khẩu thất bại. Vui lòng thử lại.';
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef<React.ElementRef<typeof AppInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof AppInput>>(null);

  /**
   * The address the code was sent to arrives through the navigation state,
   * so the visitor does not have to type it again.
   */
  useEffect(() => {
    if (typeof params.email === 'string' && params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();
    const errors: FieldErrors = {};

    if (!trimmedEmail) {
      errors.email = 'Vui lòng nhập email đã đăng ký.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Email không hợp lệ.';
    }

    if (otp.length !== 6) {
      errors.otp = 'Vui lòng nhập đủ 6 chữ số.';
    }

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    if (!confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận mật khẩu.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      // The backend changes the password and invalidates every other
      // session, so the visitor signs in again from scratch.
      await authApi.resetPassword(trimmedEmail, otp, password);
      router.replace(SIGN_IN_ROUTE as never);
    } catch (error) {
      setFormError(describeResetError(error));
    } finally {
      setSubmitting(false);
    }
  }, [confirmPassword, email, otp, password, router, submitting]);

  const goToForgot = () => {
    setFormError(null);
    router.replace(FORGOT_ROUTE as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* --- Back ---------------------------------------------------- */}
        <Pressable
          onPress={goToForgot}
          accessibilityRole="button"
          accessibilityLabel="Quay lại quên mật khẩu"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
        </Pressable>

        {/* --- Headline ------------------------------------------------ */}
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>ĐẶT LẠI MẬT KHẨU</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Nhập mã xác thực đã nhận được và mật khẩu mới cho tài khoản của bạn.
        </Text>

        {/* --- Form ---------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!submitting}
            returnKeyType="next"
            leftSlot={<Mail size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <Text style={[styles.otpLabel, { fontFamily: fontFamily.semibold }]}>Mã xác thực</Text>
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
            }}
            disabled={submitting}
            invalid={Boolean(fieldErrors.otp)}
          />
          {fieldErrors.otp ? (
            <Text style={[styles.otpError, { fontFamily: fontFamily.medium }]}>{fieldErrors.otp}</Text>
          ) : null}

          <AppInput
            ref={passwordRef}
            label="Mật khẩu mới"
            placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={fieldErrors.password}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            leftSlot={<Lock size={18} color={colors.textSubtle} strokeWidth={2.5} />}
            rightSlot={
              <Pressable
                onPress={() => setPasswordVisible((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                hitSlop={8}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
              >
                {passwordVisible ? (
                  <EyeOff size={20} color={colors.ink} strokeWidth={2.5} />
                ) : (
                  <Eye size={20} color={colors.ink} strokeWidth={2.5} />
                )}
              </Pressable>
            }
          />

          <AppInput
            ref={confirmRef}
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (fieldErrors.confirmPassword) {
                setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            error={fieldErrors.confirmPassword}
            secureTextEntry={!confirmVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            leftSlot={<Lock size={18} color={colors.textSubtle} strokeWidth={2.5} />}
            rightSlot={
              <Pressable
                onPress={() => setConfirmVisible((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={confirmVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                hitSlop={8}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}
              >
                {confirmVisible ? (
                  <EyeOff size={20} color={colors.ink} strokeWidth={2.5} />
                ) : (
                  <Eye size={20} color={colors.ink} strokeWidth={2.5} />
                )}
              </Pressable>
            }
          />

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          {/* --- Action ------------------------------------------- */}
          <AppButton
            label="Đặt lại mật khẩu"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            showAccentMark={!submitting}
          />
        </View>

        {/* --- Footer note --------------------------------------------- */}
        <View style={styles.footerNote}>
          <ShieldCheck size={14} color={colors.success} strokeWidth={2.5} />
          <Text style={[styles.footerText, { fontFamily: fontFamily.regular }]}>
            Sau khi đặt lại, các phiên đăng nhập khác của bạn sẽ bị vô hiệu hoá.
          </Text>
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
  scrollContent: {
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
    ...Platform.select({
      web: { boxShadow: '2px 2px 0 #151515' },
      default: {},
    }),
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

  otpLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  otpError: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontSize: fontSize.xs,
    color: colors.danger,
  },

  eyeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeButtonPressed: {
    opacity: 0.6,
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

  footerNote: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    textAlign: 'center',
  },
});
