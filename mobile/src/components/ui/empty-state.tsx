/**
 * `EmptyState` — shown when a list has nothing to display.
 */

import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** A Lucide icon rendered inside the yellow slab. */
  icon?: LucideIcon;
  /** Optional call to action. */
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {Icon ? (
        <View style={styles.iconBox}>
          <Icon size={30} color={colors.ink} strokeWidth={2.5} />
        </View>
      ) : null}

      <Text style={[styles.title, { color: colors.ink, fontFamily: fontFamily.bold }]}>
        {title}
      </Text>

      {description ? (
        <Text style={[styles.description, { color: colors.textMuted, fontFamily: fontFamily.regular }]}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
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
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  action: {
    marginTop: spacing.xl,
  },
});
