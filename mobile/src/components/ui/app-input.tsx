/**
 * `AppInput` — a labelled text field.
 *
 * The border thickens and the label turns ink-black when the field has
 * focus, which is the Neo Brutalism equivalent of a glow.
 */

import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

export interface AppInputProps extends TextInputProps {
  label?: string;
  /** Validation message shown under the field. */
  error?: string;
  /** Helper text shown under the field when there is no error. */
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Rendered inside the field, on the right edge — used for the
   * show/hide-password toggle. The input keeps its own padding so the
   * content never runs under the control.
   */
  rightSlot?: React.ReactNode;
  /** Extra padding on the right of the text, reserved for `rightSlot`. */
  rightInset?: number;
  /**
   * Rendered inside the field, on the left edge — used for the leading
   * field icon (user, phone, mail, lock).
   */
  leftSlot?: React.ReactNode;
  /** Extra padding on the left of the text, reserved for `leftSlot`. */
  leftInset?: number;
}

export const AppInput = forwardRef<React.ElementRef<typeof TextInput>, AppInputProps>(
  function AppInput(
    { label, error, hint, containerStyle, style, onFocus, onBlur, rightSlot, rightInset, leftSlot, leftInset, ...rest },
    ref,
  ) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : focused ? colors.ink : colors.textMuted,
              fontFamily: fontFamily.semibold,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View style={styles.fieldRow}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              borderColor: error ? colors.danger : colors.ink,
              borderWidth: focused || error ? borderWidth.lg : borderWidth.md,
              backgroundColor: colors.surface,
            },
            focused ? styles.focused : null,
            rightSlot ? { paddingRight: (rightInset ?? 44) + spacing.lg } : null,
            leftSlot ? { paddingLeft: (leftInset ?? 20) + spacing.lg } : null,
            style,
          ]}
          {...rest}
        />

        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
        {leftSlot ? <View style={styles.leftSlot}>{leftSlot}</View> : null}
      </View>

      {error ? (
        <Text style={[styles.footer, styles.errorText, { fontFamily: fontFamily.medium }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.footer, styles.hintText, { fontFamily: fontFamily.regular }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
  },
  /**
   * The row only exists when a `rightSlot` is present. The input keeps its
   * own border; the slot floats over the right edge of the field.
   */
  fieldRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  rightSlot: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  leftSlot: {
    position: 'absolute',
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  focused: {
    // A hard offset replaces the border growth, so the field appears to
    // "push" the surface.
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  footer: {
    marginTop: spacing.sm,
    fontSize: fontSize.xs,
  },
  errorText: {
    color: colors.danger,
  },
  hintText: {
    color: colors.textSubtle,
  },
});
