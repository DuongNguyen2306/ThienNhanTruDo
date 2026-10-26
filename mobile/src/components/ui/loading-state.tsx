/**
 * `LoadingState` — the placeholder shown while data is being fetched.
 */

import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface LoadingStateProps {
  message?: string;
  /** Fill the available space instead of sitting inline. */
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({
  message = 'Đang tải…',
  fullScreen = false,
  style,
}: LoadingStateProps) {
  return (
    <View
      style={[
        styles.container,
        fullScreen ? styles.fullScreen : null,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <View style={styles.spinnerBox}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
      <Text style={[styles.message, { color: colors.textMuted, fontFamily: fontFamily.medium }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
  },
  fullScreen: {
    flex: 1,
  },
  spinnerBox: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
  },
});
