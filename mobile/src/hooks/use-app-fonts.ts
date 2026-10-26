/**
 * Font loading for Be Vietnam Pro.
 *
 * The app uses ONE typeface family, in five weights. They are bundled as
 * local assets via `@expo-google-fonts/be-vietnam-pro`, so no network
 * request is needed at runtime.
 */

import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
} from '@expo-google-fonts/be-vietnam-pro';
import { useFonts } from 'expo-font';

export const fontAssets = {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
  BeVietnamPro_800ExtraBold,
};

/**
 * Load the typefaces. Returns `true` once every font is ready.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);

  if (error) {
    // A missing font must not crash the app — the fallbacks in
    // `src/constants/theme.ts` keep the UI readable.
    console.warn('[fonts] Could not load Be Vietnam Pro:', error);
    return true;
  }

  return loaded;
}
