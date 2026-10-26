/**
 * SCENE 004 — Register.
 *
 * The screen a new visitor lands on from the sign-in screen. Layout, top to
 * bottom:
 *
 *   1. the back button, on its own row
 *   2. the headline "TẠO TÀI KHOẢN" and a short line
 *   3. the form card with the five fields
 *   4. the yellow "Đăng ký" button
 *   5. the "Đã có tài khoản? Đăng nhập" link
 *   6. the footer note about e-mail verification
 *
 * The visual language is the same Neo Brutalism as SCENE 001–003: heavy ink
 * borders, hard offset shadows (never blurred), a single saturated yellow
 * accent and a warm off-white canvas.
 *
 * The form talks to the REAL Express backend through `authApi.register`.
 * That endpoint always creates a TENANT account (the role in the request
 * body is ignored by the server), creates it UNVERIFIED and e-mails a
 * 6-digit OTP. It deliberately returns NO token, so the visitor is told
 * to check their inbox and sent back to the sign-in screen. The OTP step
 * itself is SCENE 005 and is NOT implemented here.
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
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react-native';

import { AppButton, AppInput } from '@/components/ui';
import { ApiError, authApi } from '@/lib/api-client';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The sign-in route that already exists in the `(auth)` group. */
const SIGN_IN_ROUTE = '/(auth)/dang-nhap';

/** The e-mail verification screen (SCENE 005). */
const VERIFY_EMAIL_ROUTE = '/(auth)/xac-thuc-email';

/** The minimum length of a password accepted by the backend. */
const PASSWORD_MIN_LENGTH = 8;

interface FieldErrors {
  fullName?: string;
  phone?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/** The digits of a typed phone number. */
function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validate a Vietnamese mobile number.
 *
 * The backend uses `isMobilePhone('vi-VN')`, which expects the local form
 * ("0912345678"). The check below accepts the same local form, and also
 * tolerates the international form ("+84912345678" / "84912345678") by
 * normalising it first, so a pasted number is not rejected needlessly.
 */
function validatePhone(raw: string): string | undefined {
  const value = raw.trim();

  if (!value) {
    return 'Vui lòng nhập số điện thoại.';
  }

  const digits = digitsOf(value);

  let local: string | null = null;
  if (digits.length === 10 && digits.startsWith('0')) {
    local = digits;
  } else if (digits.length === 11 && digits.startsWith('84')) {
    local = `0${digits.slice(2)}`;
  }

  if (!local) {
    return 'Số điện thoại không hợp lệ.';
  }

  if (!/^0(3[2-9]|5[26889]|7[06-9]|8[1-9]|9[0-46-9])\d{7}$/.test(local)) {
    return 'Số điện thoại không hợp lệ.';
  }

  return undefined;
}

/** Validate an e-mail address. */
function validateEmail(raw: string): string | undefined {
  const value = raw.trim();

  if (!value) {
    return 'Vui lòng nhập email để nhận mã xác thực.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Email không hợp lệ.';
  }

  return undefined;
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
    return 'Vui lòng nhập mật khẩu.';
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

/**
 * Map a backend validation failure onto the field it belongs to.
 *
 * The backend's `validate` middleware answers with a generic
 * "Dữ liệu không hợp lệ" plus a `details` array whose entries carry the
 * field name in `path`.
 */
function fieldErrorsFromDetails(
  details: Array<{ msg?: string; path?: string }> | undefined,
): FieldErrors {
  const errors: FieldErrors = {};

  for (const detail of details ?? []) {
    const path = detail.path ?? '';
    const message = detail.msg ?? '';

    if (!message) continue;

    if (path.startsWith('fullName')) errors.fullName = message;
    else if (path.startsWith('phone')) errors.phone = message;
    else if (path.startsWith('email')) errors.email = message;
    else if (path.startsWith('password')) errors.password = message;
  }

  return errors;
}

/** Turn an API failure into a message the visitor can act on. */
function describeRegisterError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối rồi thử lại.';
    }
    if (error.status === 409) {
      // The backend reports phone and email collisions with one message.
      return error.message || 'Số điện thoại hoặc email đã được sử dụng.';
    }
    if (error.status === 429) {
      return 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.';
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

    // Anything else keeps the server's own Vietnamese message.
    return error.message;
  }

  return 'Đăng ký thất bại. Vui lòng thử lại.';
}

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Set once the backend confirms the account was created. */
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const phoneRef = useRef<React.ElementRef<typeof AppInput>>(null);
  const emailRef = useRef<React.ElementRef<typeof AppInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof AppInput>>(null);
  const confirmRef = useRef<React.ElementRef<typeof AppInput>>(null);

  const goToSignIn = () => {
    // `replace` (not `push`) so the back gesture leaves the app instead of
    // returning to the register screen.
    router.replace(SIGN_IN_ROUTE as never);
  };

  /**
   * Continue to the code step (SCENE 005).
   *
   * The address travels with the navigation so the visitor does not have to
   * type it again.
   */
  const goToVerify = () => {
    router.push({ pathname: VERIFY_EMAIL_ROUTE, params: { email: registeredEmail ?? '' } } as never);
  };

  const handleSubmit = async () => {
    // A second press while the request is in flight must not start a
    // second registration request.
    if (submitting) return;

    const errors: FieldErrors = {};

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      errors.fullName = 'Vui lòng nhập họ và tên.';
    }

    const phoneError = validatePhone(trimmedPhone);
    if (phoneError) errors.phone = phoneError;

    const emailError = validateEmail(trimmedEmail);
    if (emailError) errors.email = emailError;

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
      // The real backend. It creates a TENANT account (the role in the
      // body is ignored server-side), marks it UNVERIFIED and e-mails a
      // 6-digit OTP. No token comes back, so the visitor is not signed in.
      const result = await authApi.register({
        fullName: trimmedName,
        // The local form is what the backend stores.
        phone: trimmedPhone.replace(/\s/g, ''),
        email: trimmedEmail,
        password,
      });

      setRegisteredEmail(result.email || trimmedEmail);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && error.data?.details) {
        const serverErrors = fieldErrorsFromDetails(error.data.details);
        if (Object.keys(serverErrors).length > 0) {
          setFieldErrors(serverErrors);
        } else {
          setFormError(describeRegisterError(error));
        }
      } else {
        setFormError(describeRegisterError(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** Clear a field's error as soon as the visitor edits it. */
  const clearError = (key: keyof FieldErrors) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // ---------------------------------------------------------------------
  // Success state — the account exists, the e-mail still has to be proven.
  // ---------------------------------------------------------------------
  if (registeredEmail) {
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoFrame}>
              <CheckCircle2 size={44} color={colors.ink} strokeWidth={2.5} />
            </View>
          </View>

          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>
            ĐĂNG KÝ THÀNH CÔNG!
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
            Mã xác thực đã được gửi tới email của bạn. Nhập mã để hoàn tất đăng ký.
          </Text>

          <View style={styles.form}>
            <View style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Mail size={18} color={colors.ink} strokeWidth={2.5} />
              </View>
              <Text style={[styles.noticeText, { fontFamily: fontFamily.medium }]}>
                {registeredEmail}
              </Text>
            </View>

            <AppButton
              label="Nhập mã xác thực"
              size="lg"
              fullWidth
              onPress={goToVerify}
              showAccentMark
            />

            <Pressable
              onPress={goToSignIn}
              accessibilityRole="link"
              accessibilityLabel="Đăng nhập"
              hitSlop={8}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            >
              <Text style={[styles.linkText, { fontFamily: fontFamily.bold }]}>
                Đăng nhập ngay
              </Text>
            </Pressable>
          </View>
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
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>TẠO TÀI KHOẢN</Text>
        <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>
          Điền thông tin để tạo tài khoản người thuê. Mã xác thực sẽ được gửi tới email của
          bạn.
        </Text>

        {/* --- Form ---------------------------------------------------- */}
        <View style={styles.form}>
          <AppInput
            label="Họ và tên"
            placeholder="VD: Nguyễn Văn A"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              clearError('fullName');
            }}
            error={fieldErrors.fullName}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            leftSlot={<UserIcon size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            ref={phoneRef}
            label="Số điện thoại"
            placeholder="0912345678"
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              clearError('phone');
            }}
            error={fieldErrors.phone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            leftSlot={<Phone size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            ref={emailRef}
            label="Email"
            placeholder="email@example.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearError('email');
            }}
            error={fieldErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!submitting}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            leftSlot={<Mail size={18} color={colors.textSubtle} strokeWidth={2.5} />}
          />

          <AppInput
            ref={passwordRef}
            label="Mật khẩu"
            placeholder="Tối thiểu 8 ký tự, có chữ hoa và số"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearError('password');
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
            placeholder="Nhập lại mật khẩu"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              clearError('confirmPassword');
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
            label={submitting ? 'Đang đăng ký…' : 'Đăng ký'}
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
            Đã có tài khoản?
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
            THIÊN NHÃN TRÚ ĐỒ xác thực email để chống tài khoản ảo.
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

  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoFrame: {
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    ...shadow.md,
    ...Platform.select({
      web: { boxShadow: '3px 3px 0 #151515' },
      default: {},
    }),
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

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.sm,
    ...Platform.select({
      web: { boxShadow: '2px 2px 0 #151515' },
      default: {},
    }),
  },
  noticeIcon: {
    width: 36,
    height: 36,
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
  linkRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  linkText: {
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
