/**
 * `ErrorState` — shown when something went wrong.
 *
 * It always offers a way out: retry, or go back.
 */

import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Show a retry button. */
  onRetry?: () => void;
  /** Show a "go back" button. */
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = 'Đã có lỗi xảy ra',
  message = 'Vui lòng thử lại. Nếu lỗi tiếp tục, hãy liên hệ với chúng tôi.',
  onRetry,
  onBack,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconBox}>
        <AlertTriangle size={30} color={colors.danger} strokeWidth={2.5} />
      </View>

      <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.bold }]}>{title}</Text>

      <Text style={[styles.message, { color: colors.textMuted, fontFamily: fontFamily.regular }]}>
        {message}
      </Text>

      {onRetry || onBack ? (
        <View style={styles.actions}>
          {onRetry ? <AppButton label="Thử lại" onPress={onRetry} variant="primary" size="sm" /> : null}
          {onBack ? (
            <AppButton label="Quay lại" onPress={onBack} variant="secondary" size="sm" />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
