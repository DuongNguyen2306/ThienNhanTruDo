/**
 * `SellerMenuRow` — one row of the seller account menu (SCENE 027).
 */

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface SellerMenuRowProps {
  icon: LucideIcon;
  label: string;
  /** A short value shown before the chevron, e.g. "12 thông báo". */
  value?: string | number;
  onPress?: () => void;
  /** Renders in the danger colour — used for sign-out. */
  danger?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SellerMenuRow({
  icon: Icon,
  label,
  value,
  onPress,
  danger = false,
  style,
}: SellerMenuRowProps) {
  const tint = danger ? colors.danger : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        pressed ? styles.pressed : null,
        !onPress ? styles.disabled : null,
        style,
      ]}
    >
      <View style={[styles.iconBox, danger ? styles.iconBoxDanger : null]}>
        <Icon size={17} color={tint} strokeWidth={2.6} />
      </View>

      <Text style={[styles.label, { fontFamily: fontFamily.semibold, color: tint }]}>{label}</Text>

      {value !== undefined ? (
        <View style={styles.valuePill}>
          <Text style={[styles.valueText, { fontFamily: fontFamily.bold }]}>{value}</Text>
        </View>
      ) : null}

      <ChevronRight size={17} color={colors.textMuted} strokeWidth={2.6} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  disabled: {
    opacity: 0.5,
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
  },
  iconBoxDanger: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSurface,
  },
  label: {
    flex: 1,
    fontSize: fontSize.md,
  },
  valuePill: {
    minWidth: 22,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  valueText: {
    fontSize: fontSize.xs,
    color: colors.ink,
  },
});
