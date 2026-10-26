/**
 * SCENE 002 — Onboarding.
 *
 * The first screen a signed-out visitor sees (after the brand splash).
 * Layout, top to bottom:
 *
 *   1. the illustration, centred in the upper area
 *   2. the headline and the short description
 *   3. the step dots
 *   4. the "Tiếp tục" button and the "Đăng nhập" link
 *
 * Neo Brutalism: heavy ink borders, hard offset shadows, a single yellow
 * accent, warm off-white canvas. No gradients, no soft shadows.
 *
 * Only ONE step is designed so far, so the dot row shows three dots with
 * the first one active. The extra dots are placeholders for the steps that
 * have not been approved yet — they are not clickable and carry no
 * content.
 */

import { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, LogIn } from 'lucide-react-native';

import { AppButton } from '@/components/ui';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/** The sign-in route that already exists in the `(auth)` group. */
const SIGN_IN_ROUTE = '/(auth)/dang-nhap';

/** Total number of dots drawn in the step indicator. */
const STEP_COUNT = 3;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();

  /**
   * The current step. Only step 0 has approved content, so the state is
   * prepared for future steps but nothing else is rendered yet.
   */
  const [step, setStep] = useState(0);

  /**
   * The illustration shrinks on short screens so the title, the dots and
   * the button always stay visible. It never grows beyond the reference
   * size.
   */
  const artSize = useMemo(() => {
    const byHeight = height * 0.3;
    return Math.round(Math.max(150, Math.min(250, byHeight)));
  }, [height]);

  const goToSignIn = () => {
    // `replace` (not `push`) so the back gesture from the sign-in screen
    // leaves the app instead of returning to Onboarding and looping.
    router.replace(SIGN_IN_ROUTE as never);
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Illustration ----------------------------------------- */}
        <View style={styles.artArea}>
          <View style={styles.artFrame}>
            <Image
              source={require('../../assets/images/brand/onboarding-art.png')}
              style={[styles.art, { width: artSize, height: Math.round(artSize * 0.83) }]}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Minh họa người dùng đang tìm phòng trọ trên điện thoại"
            />
          </View>
        </View>

        {/* --- Headline + description -------------------------------- */}
        <View style={styles.copyArea}>
          <Text style={[styles.title, { fontFamily: fontFamily.extrabold }]}>
            TÌM PHÒNG DỄ DÀNG
          </Text>

          <Text style={[styles.description, { fontFamily: fontFamily.regular }]}>
            Khám phá hàng ngàn phòng trọ phù hợp với nhu cầu và ngân sách của bạn.
          </Text>
        </View>

        {/* --- Step dots --------------------------------------------- */}
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={`Bước ${step + 1} trên ${STEP_COUNT}`}
        >
          {Array.from({ length: STEP_COUNT }, (_, index) => {
            const isActive = index === step;

            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotIdle,
                ]}
              />
            );
          })}
        </View>

        {/* --- Actions ----------------------------------------------- */}
        <View style={styles.actions}>
          <AppButton
            label="Tiếp tục"
            size="lg"
            fullWidth
            onPress={() => {
              // Step 2 and 3 have no approved content yet, so "Tiếp tục"
              // moves the visitor to the existing sign-in screen.
              goToSignIn();
            }}
            textStyle={styles.continueLabel}
            trailingIcon={<ArrowRight size={20} color={colors.ink} strokeWidth={3} />}
          />

          <Pressable
            onPress={goToSignIn}
            accessibilityRole="link"
            accessibilityLabel="Đăng nhập"
            style={({ pressed }) => [styles.signInLink, pressed && styles.signInLinkPressed]}
          >
            <LogIn size={16} color={colors.ink} strokeWidth={2.5} />
            <Text style={[styles.signInText, { fontFamily: fontFamily.bold }]}>Đăng nhập</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },

  artArea: {
    flex: 1,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  artFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    ...shadow.lg,
    ...Platform.select({
      web: { boxShadow: '5px 5px 0 #151515' },
      default: {},
    }),
  },
  art: {
    resizeMode: 'contain',
  },

  copyArea: {
    alignItems: 'center',
    maxWidth: 380,
  },
  title: {
    fontSize: fontSize.xxl,
    color: colors.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    lineHeight: 23,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 320,
  },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    borderWidth: borderWidth.sm,
    borderColor: colors.ink,
  },
  dotActive: {
    width: 30,
    backgroundColor: colors.primary,
  },
  dotIdle: {
    backgroundColor: colors.surface,
  },

  actions: {
    alignSelf: 'stretch',
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  continueLabel: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.lg,
    letterSpacing: 0.3,
  },
  signInLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  signInLinkPressed: {
    opacity: 0.6,
  },
  signInText: {
    fontSize: fontSize.md,
    color: colors.ink,
    textDecorationLine: 'underline',
  },
});
