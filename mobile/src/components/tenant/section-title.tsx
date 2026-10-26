/**
 * `SectionTitle` — a heading with an optional trailing action.
 *
 * The small yellow square in front of the title is the brand's section
 * marker, used everywhere a list begins.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  /** A trailing link, e.g. "Xem tất cả". */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionTitle({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: SectionTitleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.marker} />

      <View style={styles.textBlock}>
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { fontFamily: fontFamily.regular }]}>{subtitle}</Text>
        ) : null}
      </View>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={[styles.actionText, { fontFamily: fontFamily.bold }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: radius.sm,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  action: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  actionPressed: {
    opacity: 0.6,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
