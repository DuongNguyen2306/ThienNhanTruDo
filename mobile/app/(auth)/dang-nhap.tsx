/**
 * SCENE 003 — Sign in.
 *
 * The screen a returning visitor lands on. Layout, top to bottom:
 *
 *   1. the brand mark, centred above the headline
 *   2. the headline "CHÀO MỪNG TRỞ LẠI!" and a short line
 *   3. the phone-number field
 *   4. the password field, with the show/hide toggle and the
 *      "Quên mật khẩu?" link
 *   5. the yellow "Đăng nhập" button
 *   6. the "Đăng ký" link
 *
 * The visual language is the same Neo Brutalism as SCENE 001/002: heavy
 * ink borders, hard offset shadows (never blurred), a single saturated
 * yellow accent and a warm off-white canvas.
 *
 * Auth is NOT handled here. The screen calls `signIn` from the existing
 * `AuthProvider`, which talks to the real Express backend, stores the JWT
 * in the device keychain and updates the session. The `(auth)` layout
 * then redirects to the right home screen for the role that came back
 * from the server.
 */

import { useRef, useState } from 'react';
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
import { Eye, EyeOff } from 'lucide-react-native';

import { SplashLogo } from '@/components/brand';
import { AppButton, AppInput } from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The size of the brand mark at the top of the screen. */
const LOGO_SIZE = 72;

/** The register route that exists in the `(auth)` group (SCENE 004). */
const REGISTER_ROUTE = '/(auth)/dang-ky';

/** The forgot-password route (SCENE 006). */
const FORGOT_PASSWORD_ROUTE = '/(auth)/quen-mat-khau';

/**
 * The minimum length of a phone number accepted by the backend.
 *
 * The backend resolves the identifier as a phone number when it is not an
 * e-mail address, and it tries both the local form ("0987654321") and the
 * international form ("+84987654321"). The check below therefore only
 * rejects what the backend could never match — it never narrows the
 * contract.
 */
const PHONE_MIN_DIGITS = 9;
const PHONE_MAX_DIGITS = 11;

interface FieldErrors {
  phone?: string;
  password?: string;
}

/** Extract the digits of a typed identifier. */
function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate the identifier.
 *
 * A phone number is the documented input, but the backend also resolves
 * an e-mail address, so a pasted address is accepted rather than being
 * silently turned into a phone number.
 */
function validateIdentifier(raw: string): string | undefined {
  const value = raw.trim();

  if (!value) {
    return 'Vui lòng nhập số điện thoại.';
  }

  if (value.includes('@')) {
    // E-mail identifier — only a rough shape check, the server has the
    // final say.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Số điện thoại không hợp lệ.';
    }
    return undefined;
  }

  const digits = digitsOf(value);

  if (digits.length < PHONE_MIN_DIGITS || digits.length > PHONE_MAX_DIGITS) {
    return 'Số điện thoại không hợp lệ.';
  }

  return undefined;
}

/** Turn an API failure into a message the visitor can act on. */
function describeLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 401) {
      return 'Số điện thoại hoặc mật khẩu không chính xác.';
    }
    if (error.status === 403 && error.requiresVerification) {
      return 'Vui lòng xác thực email trước khi đăng nhập.';
    }
    if (error.status === 403) {
      return 'Tài khoản này không được phép sử dụng ứng dụng di động.';
    }
    if (error.status === 408) {
      return 'Yêu cầu hết thời gian. Vui lòng thử lại.';
    }
    if (error.status === 429) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }

    // Anything else keeps the server's own Vietnamese message.
    return error.message;
  }

  return 'Đăng nhập thất bại. Vui lòng thử lại.';
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordRef = useRef<React.ElementRef<typeof AppInput>>(null);

  const handleSubmit = async () => {
    // A second press while the request is in flight must not start a
    // second login request.
    if (submitting) return;

    const identifier = phone.trim();
    const errors: FieldErrors = {};

    const phoneError = validateIdentifier(identifier);
    if (phoneError) errors.phone = phoneError;
    if (!password) errors.password = 'Vui lòng nhập mật khẩu.';

    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      // The provider hits the real backend, stores the JWT in the keychain
      // and updates the session. The `(auth)` layout redirects afterwards.
      await signIn(identifier, password);
    } catch (error) {
      setFormError(describeLoginError(error));
    } finally {
      setSubmitting(false);
    }
  };

  /** The secondary links are not wired up yet — no such route exists. */
  const handleUnavailableRoute = (label: string) => {
    setFormError(`${label} sẽ được bổ sung ở phiên bản tiếp theo.`);
  };

  /**
   * Open the forgot-password screen (SCENE 006).
   */
  const goToForgotPassword = () => {
    setFormError(null);
    router.push(FORGOT_PASSWORD_ROUTE as never);
  };

  /**
   * Open the register screen (SCENE 004).
   *
   * `push` is used on purpose: the back gesture from the register screen
   * returns to the sign-in screen, which is where the visitor came from.
   */
  const goToRegister = () => {
    setFormError(null);
    router.push(REGISTER_ROUTE as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* --- Brand mark -------------------------------------------- */}
        <View style={styles.logoWrap}>
          <View style={styles.logoFrame}>
            <SplashLogo size={LOGO_SIZE} />
          </View>
        </View>

        {/* --- Headline ---------------------------------------------- */}
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>CHÀO MỪNG TRỞ LẠI!</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Đăng nhập để tiếp tục tìm phòng trọ hoặc quản lý tin đăng của bạn.
        </Text>

        {/* --- Form --------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Số điện thoại"
            placeholder="0912345678"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            error={fieldErrors.phone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <AppInput
            ref={passwordRef}
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            error={fieldErrors.password}
            secureTextEntry={!passwordVisible}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            editable={!submitting}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
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

          <Pressable
            onPress={goToForgotPassword}
            accessibilityRole="link"
            accessibilityLabel="Quên mật khẩu"
            hitSlop={8}
            style={({ pressed }) => [styles.forgotLink, pressed && styles.linkPressed]}
          >
            <Text style={[styles.forgotText, { fontFamily: fontFamily.semibold }]}>
              Quên mật khẩu?
            </Text>
          </Pressable>

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          {/* --- Action ------------------------------------------- */}
          <AppButton
            label="Đăng nhập"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            showAccentMark={!submitting}
          />
        </View>

        {/* --- Register link ------------------------------------------ */}
        <View style={styles.registerArea}>
          <Text style={[styles.registerHint, { fontFamily: fontFamily.regular }]}>
            Chưa có tài khoản?
          </Text>
          <Pressable
            onPress={goToRegister}
            accessibilityRole="link"
            accessibilityLabel="Đăng ký tài khoản"
            hitSlop={8}
            style={({ pressed }) => [styles.registerLink, pressed && styles.linkPressed]}
          >
            <Text style={[styles.registerText, { fontFamily: fontFamily.bold }]}>Đăng ký</Text>
          </Pressable>
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

  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoFrame: {
    padding: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.md,
    ...Platform.select({
      web: { boxShadow: '3px 3px 0 #151515' },
      default: {},
    }),
  },

  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
  },

  form: {
    marginTop: spacing.xxl,
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

  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.xs,
  },
  forgotText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
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
});
