/**
 * `AppButton` — the primary action control.
 *
 * Neo Brutalism: a heavy black border plus a hard offset shadow that is
 * *pressed away* when the button is held. The shadow never blurs.
 */

import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The element a `Pressable` actually forwards its ref to. */
type PressableRef = React.ElementRef<typeof Pressable>;
export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type AppButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  /** Show a spinner and block further presses. */
  loading?: boolean;
  /** Render a small leading square in the accent colour. */
  showAccentMark?: boolean;
  /** Optional trailing glyph, e.g. an arrow. */
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const SURFACE: Record<AppButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: colors.ink, border: colors.ink },
  secondary: { bg: colors.surface, fg: colors.ink, border: colors.ink },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.ink },
  ghost: { bg: 'transparent', fg: colors.textMuted, border: 'transparent' },
  danger: { bg: colors.dangerSurface, fg: colors.danger, border: colors.danger },
};

const SIZE: Record<AppButtonSize, { height: number; px: number; font: number; border: number }> = {
  sm: { height: 36, px: spacing.md, font: fontSize.sm, border: borderWidth.sm },
  md: { height: 48, px: spacing.lg, font: fontSize.md, border: borderWidth.md },
  lg: { height: 56, px: spacing.xl, font: fontSize.lg, border: borderWidth.md },
};

export const AppButton = forwardRef<PressableRef, AppButtonProps>(function AppButton(
  {
    label,
    variant = 'primary',
    size = 'md',
    loading = false,
    showAccentMark = false,
    trailingIcon,
    fullWidth = false,
    disabled = false,
    style,
    textStyle,
    ...rest
  },
  ref,
) {
  const surface = SURFACE[variant];
  const metrics = SIZE[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: metrics.height,
          paddingHorizontal: metrics.px,
          borderWidth: metrics.border,
          borderColor: surface.border,
          backgroundColor: surface.bg,
        },
        // The hard shadow collapses when pressed — that is what sells the
        // "physical button" feel.
        !isDisabled && variant !== 'ghost' && !pressed ? shadow.sm : null,
        !isDisabled && variant !== 'ghost' && pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        fullWidth ? styles.fullWidth : null,
        style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={surface.fg} style={styles.spinner} />
        ) : showAccentMark ? (
          <View style={[styles.accentMark, { backgroundColor: colors.ink }]} />
        ) : null}

        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: surface.fg,
              fontSize: metrics.font,
              fontFamily: fontFamily.semibold,
            },
            textStyle,
          ]}
        >
          {label}
        </Text>

        {trailingIcon ? <View style={styles.trailingIcon}>{trailingIcon}</View> : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentMark: {
    width: 8,
    height: 8,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  label: {
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  spinner: {
    marginRight: spacing.sm,
  },
  trailingIcon: {
    marginLeft: spacing.sm,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
    elevation: 0,
  },
  disabled: {
    opacity: 0.45,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
