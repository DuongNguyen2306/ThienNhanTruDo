/**
 * `AppHeader` — the screen header.
 *
 * A yellow slab with a heavy black bottom border, a title, an optional
 * subtitle and an optional right-hand slot (back button, action, avatar).
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, spacing } from '@/constants/theme';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Content rendered on the right (back button, avatar, action). */
  right?: React.ReactNode;
  /** Content rendered on the left. */
  left?: React.ReactNode;
  /** Use the plain surface instead of the yellow slab. */
  tone?: 'primary' | 'surface';
  style?: StyleProp<ViewStyle>;
}

export function AppHeader({
  title,
  subtitle,
  right,
  left,
  tone = 'primary',
  style,
}: AppHeaderProps) {
  const isPrimary = tone === 'primary';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isPrimary ? colors.primary : colors.surface,
          borderBottomColor: colors.ink,
        },
        style,
      ]}
    >
      {left ? <View style={styles.side}>{left}</View> : null}

      <View style={styles.textBlock}>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.ink, fontFamily: fontFamily.extrabold }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[styles.subtitle, { color: colors.textMuted, fontFamily: fontFamily.medium }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View style={styles.side}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: borderWidth.lg,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
  },
  side: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
