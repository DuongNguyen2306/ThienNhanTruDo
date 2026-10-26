/**
 * Root layout — the outermost wrapper of the app.
 *
 * Responsibilities:
 *   1. Load the Be Vietnam Pro typefaces before the first screen renders.
 *   2. Provide the session (AuthProvider) to the whole tree.
 *   3. Hold the splash screen until the fonts are ready.
 *   4. Render the `Stack`, which is where the route groups are mounted.
 *
 * Route groups are organised like this:
 *
 *   app/
 *     _layout.tsx        ← this file
 *     index.tsx          ← the entry point, decides where to send the user
 *     (auth)/            ← signed-out screens
 *     (tenant)/          ← screens for the TENANT role
 *     (seller)/          ← screens for the SELLER role
 *
 * A group does NOT protect its screens. Access control lives in
 * `src/hooks/use-auth-guard.tsx`, applied by the `(tenant)` and `(seller)`
 * layouts.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppFonts } from '@/hooks/use-app-fonts';
import { AuthProvider } from '@/providers/auth-provider';
import { colors } from '@/constants/theme';

// Hold the splash screen until the fonts are loaded. `preventAutoHideAsync`
// must run at module scope, before the first render.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const fontsLoaded = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Keep the splash screen up until the typefaces are ready.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
