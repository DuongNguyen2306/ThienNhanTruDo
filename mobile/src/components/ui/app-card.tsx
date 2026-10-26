/**
 * `AppCard` — the standard content container.
 *
 * A white surface with a heavy black border and a hard offset shadow. Use
 * `onPress` to turn it into a pressable tile; the shadow collapses on
 * press, matching `AppButton`.
 */

import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { borderWidth, colors, radius, shadow, spacing } from '@/constants/theme';

export interface AppCardProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  /** Remove the default inner padding. */
  flush?: boolean;
  /** Use the warm off-white surface instead of pure white. */
  tone?: 'surface' | 'background' | 'primary';
  /** Disable the hard shadow (for nested cards). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TONE: Record<'surface' | 'background' | 'primary', string> = {
  surface: colors.surface,
  background: colors.background,
  primary: colors.primary,
};

export const AppCard = forwardRef<React.ComponentRef<typeof View>, AppCardProps>(function AppCard(
  { children, flush = false, tone = 'surface', flat = false, onPress, style, disabled, ...rest },
  ref,
) {
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: TONE[tone] },
        flat ? null : shadow.md,
        !flush ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (!onPress) {
    return (
      <View ref={ref} style={styles.wrapper}>
        {content}
      </View>
    );
  }

  return (
    <View ref={ref} style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          pressed && !flat ? styles.pressed : null,
          disabled ? styles.disabled : null,
        ]}
        {...rest}
      >
        {content}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.lg,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
