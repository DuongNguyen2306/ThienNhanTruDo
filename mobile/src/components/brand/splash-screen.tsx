/**
 * `SplashScreen` — SCENE 001.
 *
 * The brand splash of THIÊN NHÃN TRÚ ĐỒ:
 *
 *   - warm cream canvas (#F5F5F0)
 *   - the house/location-pin logo in yellow and ink
 *   - the two-line wordmark
 *   - the slogan line
 *   - scattered stars, dots and rings as flat decorations
 *   - a yellow loading bar with an ink border and a hard offset shadow
 *   - the caption "ĐANG TẢI..."
 *
 * Purely presentational: it owns no session logic and no navigation. The
 * caller decides when to show it and when to move on.
 */

import { memo, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { SplashLogo } from './splash-logo';
import { borderWidth, colors, fontFamily, fontSize, radius, shadow, spacing } from '@/constants/theme';

/* ------------------------------------------------------------------ */
/* Decorations                                                        */
/* ------------------------------------------------------------------ */

/** A four-point sparkle, drawn as two crossed diamonds. */
function Star({ size = 22, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z"
        fill={color}
      />
    </Svg>
  );
}

/** A hollow ring. */
function Ring({ size = 30, color = colors.ink, strokeWidth: sw = 3 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={13} fill="none" stroke={color} strokeWidth={sw} />
    </Svg>
  );
}

/** A solid dot. */
function Dot({ size = 10, color = colors.ink }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Circle cx={6} cy={6} r={5} fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export interface SplashScreenProps {
  /** Progress 0 → 1. When omitted, an indefinite loop animation is used. */
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

function SplashScreenBase({ progress, style }: SplashScreenProps) {
  const loader = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  useEffect(() => {
    if (progress !== undefined) {
      // Deterministic mode: the bar reflects the real progress.
      loader.setValue(progress);
      return;
    }

    // Indeterminate mode: sweep the bar back and forth.
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(loader, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(loader, {
          toValue: 0.08,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [loader, progress]);

  const width = loader.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.content, { opacity: fade }]}>
        {/* --- Decorative field ------------------------------------- */}
        <View pointerEvents="none" style={styles.decorations}>
          <View style={[styles.decor, styles.decorTopLeft]}>
            <Star size={26} />
          </View>
          <View style={[styles.decor, styles.decorTopRight]}>
            <Ring size={34} strokeWidth={3.5} />
          </View>
          <View style={[styles.decor, styles.decorMidLeft]}>
            <Dot size={12} />
          </View>
          <View style={[styles.decor, styles.decorMidRight]}>
            <Star size={18} color={colors.ink} />
          </View>
          <View style={[styles.decor, styles.decorLowerLeft]}>
            <Ring size={24} strokeWidth={3} />
          </View>
          <View style={[styles.decor, styles.decorLowerRight]}>
            <Dot size={9} color={colors.primaryDark} />
          </View>
        </View>

        {/* --- Logo ------------------------------------------------- */}
        <View style={styles.logoWrap}>
          <SplashLogo size={132} />
        </View>

        {/* --- Wordmark --------------------------------------------- */}
        <View style={styles.wordmark}>
          <Text
            style={styles.brandLine}
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            THIÊN NHÃN
          </Text>
          <Text
            style={styles.brandLine}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            TRÚ ĐỒ
          </Text>
        </View>

        {/* --- Slogan ------------------------------------------------ */}
        <Text style={styles.slogan} numberOfLines={2} adjustsFontSizeToFit>
          TÌM PHÒNG DỄ DÀNG – AN TÂM AN CƯ
        </Text>

        {/* --- Loader ------------------------------------------------ */}
        <View style={styles.loaderArea}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width }]} />
          </View>
          <Text style={styles.loaderLabel}>ĐANG TẢI...</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export const SplashScreen = memo(SplashScreenBase);

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },

  decorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decor: {
    position: 'absolute',
  },
  decorTopLeft: { top: '4%', left: '6%' },
  decorTopRight: { top: '11%', right: '4%' },
  decorMidLeft: { top: '32%', left: '10%' },
  decorMidRight: { top: '38%', right: '8%' },
  decorLowerLeft: { bottom: '30%', left: '5%' },
  decorLowerRight: { bottom: '22%', right: '11%' },

  logoWrap: {
    marginBottom: spacing.xxl,
  },

  wordmark: {
    alignItems: 'center',
  },
  brandLine: {
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.display,
    color: colors.ink,
    letterSpacing: 1,
    lineHeight: 44,
    textAlign: 'center',
  },

  slogan: {
    marginTop: spacing.md,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  loaderArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: spacing.huge,
  },
  barTrack: {
    width: '100%',
    maxWidth: 260,
    height: 16,
    borderRadius: radius.pill,
    borderWidth: borderWidth.md,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow.sm,
    ...Platform.select({
      web: { boxShadow: '2px 2px 0 #151515' },
      default: {},
    }),
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  loaderLabel: {
    marginTop: spacing.lg,
    fontFamily: fontFamily.extrabold,
    fontSize: fontSize.sm,
    color: colors.ink,
    letterSpacing: 2,
  },
});
