import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setFontsReady(true);
      SplashScreen.hideAsync().catch(() => {});
      return;
    }
    const timer = setTimeout(() => {
      setFontsReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 5000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);

  const inner = !fontsReady ? (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }} />
  ) : (
    <ThemeProvider value={DarkTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </ThemeProvider>
  );

  if (Platform.OS !== 'web') {
    return inner;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <View style={{ maxWidth: 420, width: '100%', alignSelf: 'center', flex: 1, minHeight: '100vh' as unknown as number }}>
        {inner}
      </View>
    </View>
  );
}
