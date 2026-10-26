/**
 * `SplashLogo` — the brand mark: a location pin that doubles as a house.
 *
 * Drawn as vector SVG (not a bitmap) so it stays crisp on every density
 * and can be recoloured by the theme tokens:
 *
 *   - the pin body is brand yellow with a heavy ink outline
 *   - the house inside is solid ink with a small yellow door
 *
 * The mark scales with `size` and keeps its proportions at any dimension.
 */

import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface SplashLogoProps {
  /** Width/height of the square mark in pixels. */
  size?: number;
}

function SplashLogoBase({ size = 132 }: SplashLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* Location pin body — yellow with an ink outline. */}
      <Path
        d="M60 6C36.6 6 18 25.4 18 49.4C18 78.5 60 114 60 114C60 114 102 78.5 102 49.4C102 25.4 83.4 6 60 6Z"
        fill="#FDE047"
        stroke="#151515"
        strokeWidth={5}
        strokeLinejoin="round"
      />

      {/* Inner white halo so the house reads clearly on the yellow. */}
      <Circle cx={60} cy={49} r={26} fill="#FFFFFF" stroke="#151515" strokeWidth={4} />

      {/* House roof. */}
      <Path
        d="M41 55L60 38L79 55"
        fill="none"
        stroke="#151515"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* House body. */}
      <Rect x={47} y={53} width={26} height={20} fill="#151515" />

      {/* Door + window punched back out in yellow. */}
      <Rect x={56} y={61} width={8} height={12} fill="#FDE047" />
      <Rect x={49} y={57} width={5} height={5} fill="#FDE047" />
    </Svg>
  );
}

export const SplashLogo = memo(SplashLogoBase);
