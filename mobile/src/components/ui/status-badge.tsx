/**
 * `StatusBadge` — a small pill that labels a state.
 *
 * The palette follows the design system: verified green, pending orange,
 * plus neutral and danger variants.
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export type StatusBadgeVariant =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'info'
  | 'neutral'
  | 'primary';

export interface StatusBadgeProps {
  label: string;
  variant?: StatusBadgeVariant;
  /** Show a leading dot in the accent colour. */
  withDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANT: Record<StatusBadgeVariant, { bg: string; fg: string; border: string; dot: string }> = {
  verified: {
    bg: colors.successSurface,
    fg: colors.success,
    border: colors.success,
    dot: colors.success,
  },
  pending: {
    bg: colors.warningSurface,
    fg: colors.warning,
    border: colors.warning,
    dot: colors.warning,
  },
  rejected: {
    bg: colors.dangerSurface,
    fg: colors.danger,
    border: colors.danger,
    dot: colors.danger,
  },
  info: {
    bg: colors.infoSurface,
    fg: colors.info,
    border: colors.info,
    dot: colors.info,
  },
  neutral: {
    bg: colors.background,
    fg: colors.textMuted,
    border: colors.ink,
    dot: colors.textMuted,
  },
  primary: {
    bg: colors.primary,
    fg: colors.ink,
    border: colors.ink,
    dot: colors.ink,
  },
};

export function StatusBadge({
  label,
  variant = 'neutral',
  withDot = false,
  style,
}: StatusBadgeProps) {
  const tone = VARIANT[variant];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }, style]}>
      {withDot ? <View style={[styles.dot, { backgroundColor: tone.dot }]} /> : null}
      <Text style={[styles.label, { color: tone.fg, fontFamily: fontFamily.semibold }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    marginRight: spacing.xs + 2,
  },
  label: {
    fontSize: fontSize.xs,
    letterSpacing: 0.2,
  },
});
