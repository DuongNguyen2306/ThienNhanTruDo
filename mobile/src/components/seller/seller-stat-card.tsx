/**
 * `SellerStatCard` — one counter on the seller dashboard (SCENE 020).
 *
 * The value is always a real number from `GET /api/seller/dashboard`; the
 * component never renders a placeholder figure.
 */

import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

export interface SellerStatCardProps {
  label: string;
  value: number | string;
  /** Optional unit or qualifier shown after the value. */
  hint?: string;
  icon: LucideIcon;
  /** Filled yellow instead of white — used for the primary counter. */
  accent?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SellerStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
  onPress,
  style,
}: SellerStatCardProps) {
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: accent ? colors.primary : colors.surface },
        style,
      ]}
    >
      <View style={styles.iconBox}>
        <Icon size={16} color={colors.ink} strokeWidth={2.6} />
      </View>

      <Text
        numberOfLines={1}
        style={[styles.value, { fontFamily: fontFamily.extrabold }]}
      >
        {value}
      </Text>

      <Text numberOfLines={2} style={[styles.label, { fontFamily: fontFamily.medium }]}>
        {label}
      </Text>

      {hint ? (
        <Text numberOfLines={1} style={[styles.hint, { fontFamily: fontFamily.regular }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    borderRadius: radius.lg,
  },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    padding: spacing.md,
    ...shadow.sm,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 2 }],
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  label: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  hint: {
    marginTop: spacing.xxs,
    fontSize: fontSize.xs,
    color: colors.textSubtle,
  },
});
