/**
 * A shared placeholder for screens that are not built yet.
 *
 * SCENE 001 onward fills these in one by one. The placeholder keeps the
 * navigation structure honest: every tab in the spec has a real route, so
 * the information architecture can be reviewed before the UI exists.
 */

import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard } from '@/components/ui';
import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface PlaceholderScreenProps {
  /** The name of the screen, as it appears in the spec. */
  title: string;
  /** Which scene implements it. */
  scene: string;
  description?: string;
  icon?: LucideIcon;
}

export function PlaceholderScreen({
  title,
  scene,
  description = 'Màn hình này sẽ được triển khai ở giai đoạn tiếp theo.',
  icon: Icon,
}: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.titleBlock}>
        {Icon ? (
          <View style={styles.iconBox}>
            <Icon size={26} color={colors.ink} strokeWidth={2.5} />
          </View>
        ) : null}
        <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>{title}</Text>
      </View>

      <AppCard style={styles.card}>
        <View style={styles.sceneTag}>
          <Text style={[styles.sceneTagText, { fontFamily: fontFamily.bold }]}>{scene}</Text>
        </View>
        <Text style={[styles.description, { fontFamily: fontFamily.regular }]}>{description}</Text>
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  titleBlock: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  card: {
    alignItems: 'flex-start',
  },
  sceneTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    marginBottom: spacing.md,
  },
  sceneTagText: {
    fontSize: fontSize.xs,
    color: colors.ink,
    letterSpacing: 0.4,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
