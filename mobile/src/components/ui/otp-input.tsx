/**
 * `OtpInput` — a six-box code field.
 *
 * The visitor types a six-digit code. The boxes are purely visual: a single
 * hidden `TextInput` keeps the caret, so pasting a code works and the
 * keyboard behaves like a normal one-digit-at-a-time field.
 *
 * Used by SCENE 005 (registration), SCENE 006 (forgot password) and
 * SCENE 007 (reset password).
 */

import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { borderWidth, colors, fontFamily, fontSize, radius, spacing } from '@/constants/theme';

/** How many digits a code has. */
export const OTP_LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the last box is filled. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  /** Show the field in the error colour. */
  invalid?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  style,
}: OtpInputProps) {
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      // Only digits survive, and only the first six of them.
      const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
      onChange(digits);
      if (digits.length === OTP_LENGTH) {
        onComplete?.(digits);
      }
    },
    [onChange, onComplete],
  );

  return (
    <View style={style}>
      <Pressable onPress={focus} accessibilityRole="button" accessibilityLabel="Nhập mã xác thực">
        <View style={styles.row}>
          {Array.from({ length: OTP_LENGTH }, (_, index) => {
            const char = value[index] ?? '';
            const isActive = focused && index === Math.min(value.length, OTP_LENGTH - 1);

            return (
              <View
                key={index}
                style={[
                  styles.box,
                  {
                    borderColor: invalid ? colors.danger : colors.ink,
                    borderWidth: focused || invalid ? borderWidth.lg : borderWidth.md,
                    backgroundColor: colors.surface,
                  },
                  isActive ? styles.active : null,
                ]}
              >
                <TextInput
                  value={char}
                  onChangeText={handleChange}
                  editable={!disabled}
                  maxLength={1}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  caretHidden
                  contextMenuHidden
                  showSoftInputOnFocus={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={styles.hiddenInput}
                />
                <Text style={[styles.char, { fontFamily: fontFamily.extrabold }]}>{char}</Text>
              </View>
            );
          })}
        </View>
      </Pressable>

      {/* The real input: invisible, but it owns the keyboard and the paste. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        editable={!disabled}
        maxLength={OTP_LENGTH}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        caretHidden
        style={styles.captiveInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxHeight: 62,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  char: {
    fontSize: fontSize.xxl,
    color: colors.ink,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0,
    textAlign: 'center',
  },
  captiveInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
