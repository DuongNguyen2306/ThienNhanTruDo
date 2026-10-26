/**
 * THIÊN NHÃN TRÚ ĐỒ — Design tokens.
 *
 * The visual language is "Sophisticated Neo Brutalism": heavy black ink
 * borders, hard offset shadows (never blurred), a single saturated yellow
 * accent and a warm off-white canvas. The tokens below are the ONLY place
 * these values live; every component reads from here.
 */

export const colors = {
  /** Primary brand yellow — actions, highlights, active states. */
  primary: '#FDE047',
  /** Primary pressed / stronger yellow. */
  primaryDark: '#F5C518',

  /** Ink black — every border, every headline. */
  ink: '#151515',

  /** Warm off-white — app canvas and card surfaces. */
  background: '#F5F5F0',
  /** Pure white — inputs, elevated surfaces. */
  surface: '#FFFFFF',

  /** Text on light surfaces. */
  text: '#151515',
  /** Secondary text. */
  textMuted: '#6B6B6B',
  /** Tertiary / hint text. */
  textSubtle: '#9A9A9A',

  /** Verified green — approved sellers, verified e-mails. */
  success: '#059669',
  successSurface: '#BBF7D0',

  /** Pending orange — awaiting approval. */
  warning: '#EA580C',
  warningSurface: '#FED7AA',

  /** Error red — rejected, failed. */
  danger: '#DC2626',
  dangerSurface: '#FEE2E2',

  /** Informational blue. */
  info: '#2563EB',
  infoSurface: '#DBEAFE',

  /** Hairline divider built from the ink colour. */
  border: '#151515',
  /** Softer border for non-emphasis separators. */
  borderMuted: '#D4D4D0',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
} as const;

/**
 * Neo Brutalism elevation.
 *
 * `shadowOffset` is a hard offset with ZERO blur — the shadow reads as a
 * second sheet of paper, not a glow. This is the single most important
 * rule of the style.
 */
export const shadow = {
  sm: {
    shadowColor: colors.ink,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  md: {
    shadowColor: colors.ink,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.ink,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
} as const;

/**
 * Border widths. Neo Brutalism needs a heavy, deliberate outline.
 */
export const borderWidth = {
  sm: 1.5,
  md: 2,
  lg: 3,
} as const;

/**
 * Typography — Be Vietnam Pro only.
 *
 * The web app uses the same family; keeping the weights aligned means the
 * mobile UI feels like the same product.
 */
export const fontFamily = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  extrabold: 'BeVietnamPro_800ExtraBold',
  black: 'BeVietnamPro_900Black',
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  shadow,
  borderWidth,
  fontFamily,
  fontSize,
  lineHeight,
} as const;

export type Theme = typeof theme;
