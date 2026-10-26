/**
 * SCENE 031 — Change Password (Đổi mật khẩu).
 *
 * Calls `PUT /api/auth/password` with `{ currentPassword, newPassword }`.
 *
 * The backend enforces the real rules:
 *   - current password must match (401 if not)
 *   - new password ≥ 8 characters, at least one uppercase letter and one digit
 *   - the new password may not equal the current one
 *
 * On success the backend rotates the session epoch — every OTHER device is
 * signed out — and returns a FRESH token. That token is stored in the
 * keychain immediately, otherwise this device would be logged out on its
 * next request. The session stays alive; the app does not sign the user out
 * on its own.
 *
 * The password is never logged, never persisted, and the inputs are
 * cleared from state as soon as the call succeeds.
 */

import { useCallback, useRef, useState } from 'react';
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
import { ArrowLeft, Check, Eye, EyeOff, Info, KeyRound } from 'lucide-react-native';

import { AppButton, AppCard, AppHeader, AppInput } from '@/components/ui';
import { authApi } from '@/lib/api-client';
import { secureTokenStore } from '@/lib/secure-token-store';
import { useAuth } from '@/providers/auth-provider';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

const SECURITY_ROUTE = '/(seller)/bao-mat';

interface FieldErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const inFlight = useRef(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(SECURITY_ROUTE as never);
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (inFlight.current) return;

    const nextErrors: FieldErrors = {};

    if (!currentPassword) {
      nextErrors.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    }

    if (!newPassword) {
      nextErrors.newPassword = 'Vui lòng nhập mật khẩu mới.';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Mật khẩu mới phải có ít nhất 8 ký tự.';
    } else if (!/[A-Z]/.test(newPassword)) {
      nextErrors.newPassword = 'Mật khẩu mới phải có ít nhất một chữ hoa.';
    } else if (!/\d/.test(newPassword)) {
      nextErrors.newPassword = 'Mật khẩu mới phải có ít nhất một chữ số.';
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = 'Mật khẩu mới không được trùng mật khẩu hiện tại.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu mới.';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }

    setErrors(nextErrors);
    setFormError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    try {
      const result = await authApi.changePassword(currentPassword, newPassword);

      // The old token is now invalid for every device, including this one.
      // Storing the fresh token keeps the current session alive.
      if (result.token) {
        await secureTokenStore.set(result.token);
      }

      // Clear the secrets from memory as soon as they are no longer needed.
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSuccessMessage(result.message || 'Đổi mật khẩu thành công.');

      // Re-read the session so the app state matches the rotated epoch.
      await refresh();
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : 'Không đổi được mật khẩu. Vui lòng thử lại.',
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [confirmPassword, currentPassword, newPassword, refresh]);

  const canSubmit =
    currentPassword.length > 0 && newPassword.length > 0 && confirmPassword.length > 0;

  return (
    <View style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top }}>
          <AppHeader
            title="Đổi mật khẩu"
            subtitle="Bảo vệ tài khoản chủ trọ"
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
              Sau khi đổi mật khẩu, các thiết bị khác sẽ bị đăng xuất. Thiết bị này vẫn giữ phiên
              đăng nhập.
            </Text>
          </View>

          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { fontFamily: fontFamily.medium }]}>{formError}</Text>
            </View>
          ) : null}

          {successMessage ? (
            <View style={styles.successBanner}>
              <View style={styles.successRow}>
                <Check size={16} color={colors.success} strokeWidth={3} />
                <Text style={[styles.successText, { fontFamily: fontFamily.semibold }]}>
                  {successMessage}
                </Text>
              </View>
            </View>
          ) : null}

          <AppCard>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <KeyRound size={16} color={colors.ink} strokeWidth={2.6} />
              </View>
              <Text style={[styles.cardTitle, { fontFamily: fontFamily.extrabold }]}>
                MẬT KHẨU
              </Text>
            </View>

            <AppInput
              label="Mật khẩu hiện tại *"
              placeholder="Nhập mật khẩu đang dùng"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              error={errors.currentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="next"
              rightSlot={
                <Pressable
                  onPress={() => setShowCurrent((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  hitSlop={8}
                >
                  {showCurrent ? (
                    <EyeOff size={18} color={colors.textMuted} strokeWidth={2.4} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} strokeWidth={2.4} />
                  )}
                </Pressable>
              }
            />

            <AppInput
              label="Mật khẩu mới *"
              placeholder="Ít nhất 8 ký tự, có chữ hoa và số"
              value={newPassword}
              onChangeText={setNewPassword}
              error={errors.newPassword}
              hint="Ít nhất 8 ký tự, gồm chữ hoa và chữ số."
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              rightSlot={
                <Pressable
                  onPress={() => setShowNew((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                  hitSlop={8}
                >
                  {showNew ? (
                    <EyeOff size={18} color={colors.textMuted} strokeWidth={2.4} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} strokeWidth={2.4} />
                  )}
                </Pressable>
              }
            />

            <AppInput
              label="Xác nhận mật khẩu mới *"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              containerStyle={styles.lastField}
              rightSlot={
                <Pressable
                  onPress={() => setShowConfirm((value) => !value)}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  hitSlop={8}
                >
                  {showConfirm ? (
                    <EyeOff size={18} color={colors.textMuted} strokeWidth={2.4} />
                  ) : (
                    <Eye size={18} color={colors.textMuted} strokeWidth={2.4} />
                  )}
                </Pressable>
              }
            />
          </AppCard>

          <AppButton
            label="Xác nhận đổi mật khẩu"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting || !canSubmit}
            fullWidth
            size="lg"
            showAccentMark
            style={styles.submit}
          />

          {successMessage ? (
            <AppButton
              label="Quay lại bảo mật"
              variant="secondary"
              fullWidth
              style={styles.submit}
              onPress={() => router.replace(SECURITY_ROUTE as never)}
            />
          ) : null}
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
  successBanner: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.success,
    backgroundColor: colors.successSurface,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  successText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.success,
    lineHeight: 19,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  lastField: {
    marginBottom: 0,
  },
  submit: {
    marginTop: spacing.xl,
  },
});
