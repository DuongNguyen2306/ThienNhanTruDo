/**
 * SCENE 005 — Verify e-mail (OTP).
 *
 * The step that follows the register screen (SCENE 004). The backend
 * creates the account UNVERIFIED and e-mails a six-digit code; this screen
 * collects that code and proves the address.
 *
 * Layout, top to bottom:
 *
 *   1. the back button
 *   2. the headline "XÁC THỰC EMAIL" and a short line
 *   3. the address the code was sent to
 *   4. the six-box code field
 *   5. the countdown + "Gửi lại mã" link
 *   6. the yellow "Xác minh" button
 *
 * The flow is real: `POST /api/auth/verify-email` consumes the code and
 * returns a real token, so the session opens immediately — the visitor
 * does NOT have to type their password again.
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
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react-native';

import { AppButton, AppInput, OtpInput } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The register screen, where the visitor came from. */
const REGISTER_ROUTE = '/(auth)/dang-ky';

/** How long the visitor must wait before asking for another code. */
const RESEND_COOLDOWN_SECONDS = 60;

interface FieldErrors {
  otp?: string;
  email?: string;
}

/** Turn an API failure into a message the visitor can act on. */
function describeVerifyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 400) {
      // The backend reports every OTP problem with a precise Vietnamese
      // message (expired, consumed, wrong, too many attempts).
      return error.message || 'Mã xác thực không hợp lệ.';
    }
    if (error.status === 403) {
      return 'Mã xác thực không thuộc về tài khoản này.';
    }
    if (error.status === 404) {
      return 'Không tìm thấy tài khoản cần xác thực.';
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

  return 'Xác minh thất bại. Vui lòng thử lại.';
}

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { verifyRegistrationOtp } = useAuth();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  const emailRef = useRef<React.ElementRef<typeof AppInput>>(null);

  const params = useLocalSearchParams<{ email?: string }>();

  /**
   * The address the code was sent to is passed in through the navigation
   * state, so the visitor does not have to type it again. It is optional:
   * the field can be filled by hand.
   */
  useEffect(() => {
    if (typeof params.email === 'string' && params.email) {
      setEmail(params.email);
    }
  }, [params.email]);

  // The resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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

    setFieldErrors(errors);
    setFormError(null);
    setResendNotice(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      // The backend consumes the code and issues a real token, so the
      // session opens here — the visitor is not asked for the password.
      await verifyRegistrationOtp(trimmedEmail, otp);
    } catch (error) {
      setFormError(describeVerifyError(error));
    } finally {
      setSubmitting(false);
    }
  }, [email, otp, submitting, verifyRegistrationOtp]);

  const handleResend = useCallback(async () => {
    if (resending || cooldown > 0) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setFieldErrors({ email: 'Vui lòng nhập email đã đăng ký.' });
      return;
    }

    setResending(true);
    setFormError(null);
    setResendNotice(null);

    try {
      const result = await authApi.resendVerification(trimmedEmail);
      setResendNotice(result.message);
      setCooldown(result.resendAvailableIn || RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      setFormError(describeVerifyError(error));
    } finally {
      setResending(false);
    }
  }, [cooldown, email, resending]);

  const goToRegister = () => {
    setFormError(null);
    router.replace(REGISTER_ROUTE as never);
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
          onPress={goToRegister}
          accessibilityRole="button"
          accessibilityLabel="Quay lại đăng ký"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
        </Pressable>

        {/* --- Headline ------------------------------------------------ */}
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>XÁC THỰC EMAIL</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Nhập mã 6 chữ số đã được gửi tới email của bạn để hoàn tất đăng ký.
        </Text>

        {/* --- Where the code went -------------------------------------- */}
        <View style={styles.mailCard}>
          <View style={styles.mailIcon}>
            <Mail size={18} color={colors.ink} strokeWidth={2.5} />
          </View>
          <View style={styles.mailTextBlock}>
            <Text style={[styles.mailLabel, { fontFamily: fontFamily.medium }]}>
              Mã xác thực đã gửi tới
            </Text>
            <Text style={[styles.mailValue, { fontFamily: fontFamily.bold }]}>
              {email || 'email của bạn'}
            </Text>
          </View>
        </View>

        {/* --- Form ---------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            ref={emailRef}
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
            onSubmitEditing={() => setFormError(null)}
            leftSlot={<Mail size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <Text style={[styles.otpLabel, { fontFamily: fontFamily.semibold }]}>Mã xác thực</Text>
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
            }}
            onComplete={() => {
              void handleSubmit();
            }}
            disabled={submitting}
            invalid={Boolean(fieldErrors.otp)}
          />
          {fieldErrors.otp ? (
            <Text style={[styles.otpError, { fontFamily: fontFamily.medium }]}>{fieldErrors.otp}</Text>
          ) : null}

          {/* --- Resend ------------------------------------------------- */}
          <View style={styles.resendRow}>
            {cooldown > 0 ? (
              <Text style={[styles.resendHint, { fontFamily: fontFamily.regular }]}>
                Gửi lại mã sau {cooldown}s
              </Text>
            ) : (
              <Pressable
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel="Gửi lại mã xác thực"
                hitSlop={8}
                disabled={resending}
                style={({ pressed }) => [styles.resendLink, pressed && styles.linkPressed]}
              >
                <Text style={[styles.resendText, { fontFamily: fontFamily.bold }]}>
                  {resending ? 'Đang gửi…' : 'Gửi lại mã'}
                </Text>
              </Pressable>
            )}
          </View>

          {resendNotice ? (
            <View style={styles.noticeBanner}>
              <Text style={[styles.noticeText, { fontFamily: fontFamily.medium }]}>{resendNotice}</Text>
            </View>
          ) : null}

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          {/* --- Action ------------------------------------------- */}
          <AppButton
            label="Xác minh"
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
            Mã có hiệu lực trong thời gian ngắn và chỉ dùng được một lần.
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

  mailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...shadow.sm,
    ...Platform.select({
      web: { boxShadow: '2px 2px 0 #151515' },
      default: {},
    }),
  },
  mailIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  mailTextBlock: {
    flex: 1,
  },
  mailLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  mailValue: {
    fontSize: fontSize.md,
    color: colors.ink,
    marginTop: 2,
  },

  form: {
    marginTop: spacing.xl,
  },

  otpLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  otpError: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.danger,
  },

  resendRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    minHeight: 24,
    justifyContent: 'center',
  },
  resendHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  resendLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  resendText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  linkPressed: {
    opacity: 0.6,
  },

  noticeBanner: {
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.success,
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
