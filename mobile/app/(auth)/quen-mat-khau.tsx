/**
 * SCENE 006 — Forgot password.
 *
 * The first half of the password-reset flow. The visitor types the e-mail
 * address of their account; the backend e-mails a six-digit code and
 * answers with the SAME message whether or not the address exists, so the
 * screen must never claim that an account was found.
 *
 * Layout, top to bottom:
 *
 *   1. the back button
 *   2. the headline "QUÊN MẬT KHẨU?" and a short line
 *   3. the e-mail field
 *   4. the yellow "Gửi mã xác thực" button
 *   5. the "Đã nhớ mật khẩu? Đăng nhập" link
 *
 * When the request succeeds the screen moves to SCENE 007, where the code
 * and the new password are collected.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react-native';

import { AppButton, AppInput } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The sign-in screen, where the visitor came from. */
const SIGN_IN_ROUTE = '/(auth)/dang-nhap';

/** The reset screen (SCENE 007) — the code and the new password live there. */
const RESET_ROUTE = '/(auth)/dat-lai-mat-khau';

interface FieldErrors {
  email?: string;
}

/** Turn an API failure into a message the visitor can act on. */
function describeForgotError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 400) {
      return error.message || 'Email không hợp lệ.';
    }
    if (error.status === 429) {
      return error.data?.retryAfter
        ? `Vui lòng chờ ${error.data.retryAfter} giây trước khi gửi lại mã.`
        : 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau.';
    }
    if (error.status === 503) {
      return 'Không gửi được mã xác thực. Vui lòng thử lại sau.';
    }
    if (error.status === 408) {
      return 'Yêu cầu hết thời gian. Vui lòng thử lại.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }

    return error.message;
  }

  return 'Không gửi được mã xác thực. Vui lòng thử lại.';
}

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setFieldErrors({ email: 'Vui lòng nhập email đã đăng ký.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFieldErrors({ email: 'Email không hợp lệ.' });
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSubmitting(true);

    try {
      // The backend never confirms whether the address exists. The same
      // generic answer comes back either way, so the screen simply moves
      // on to the code step.
      await authApi.forgotPassword(trimmedEmail);
      router.push({ pathname: RESET_ROUTE, params: { email: trimmedEmail } } as never);
    } catch (error) {
      setFormError(describeForgotError(error));
    } finally {
      setSubmitting(false);
    }
  }, [email, router, submitting]);

  const goToSignIn = () => {
    setFormError(null);
    router.replace(SIGN_IN_ROUTE as never);
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
          onPress={goToSignIn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại đăng nhập"
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <ArrowLeft size={22} color={colors.ink} strokeWidth={3} />
        </Pressable>

        {/* --- Headline ------------------------------------------------ */}
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>QUÊN MẬT KHẨU?</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Nhập email đã đăng ký. Chúng tôi sẽ gửi một mã xác thực để bạn đặt lại mật khẩu.
        </Text>

        {/* --- Form ---------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (fieldErrors.email) setFieldErrors({});
            }}
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            leftSlot={<Mail size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          <AppButton
            label="Gửi mã xác thực"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            showAccentMark={!submitting}
          />
        </View>

        {/* --- Sign-in link ------------------------------------------- */}
        <View style={styles.registerArea}>
          <Text style={[styles.registerHint, { fontFamily: fontFamily.regular }]}>
            Đã nhớ mật khẩu?
          </Text>
          <Pressable
            onPress={goToSignIn}
            accessibilityRole="link"
            accessibilityLabel="Đăng nhập"
            hitSlop={8}
            style={({ pressed }) => [styles.registerLink, pressed && styles.linkPressed]}
          >
            <Text style={[styles.registerText, { fontFamily: fontFamily.bold }]}>Đăng nhập</Text>
          </Pressable>
        </View>

        {/* --- Footer note --------------------------------------------- */}
        <View style={styles.footerNote}>
          <ShieldCheck size={14} color={colors.success} strokeWidth={2.5} />
          <Text style={[styles.footerText, { fontFamily: fontFamily.regular }]}>
            Vì lý do an toàn, chúng tôi luôn trả lời giống nhau dù email có tồn tại hay không.
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

  registerArea: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  registerHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  registerLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  registerText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
  linkPressed: {
    opacity: 0.6,
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
