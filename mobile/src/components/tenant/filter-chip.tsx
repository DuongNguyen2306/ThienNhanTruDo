/**
 * `FilterChip` — a toggleable pill used by the search filters.
 *
 * The unselected chip is a plain white slab; the selected one is filled
 * with the brand yellow, so the active filters read at a glance.
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Show a leading dot in the accent colour. */
  withDot?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function FilterChip({
  label,
  selected = false,
  onPress,
  withDot = false,
  style,
}: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: colors.ink,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {withDot ? (
        <View style={[styles.dot, { backgroundColor: selected ? colors.ink : colors.textMuted }]} />
      ) : null}
      <Text
        style={[
          styles.label,
          {
            color: colors.ink,
            fontFamily: selected ? fontFamily.bold : fontFamily.medium,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: fontSize.sm,
  },
});
