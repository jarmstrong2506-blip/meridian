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
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    (async () => {
      console.log('[auth] bootstrap running');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[auth] existing session');
        } else {
          await supabase.auth.signInAnonymously();
          console.log('[auth] signed in anonymously');
        }
      } catch (e) {
        console.log('[auth] error:', e);
      }
    })();
  }, []);

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
    <View style={{ flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 430, flex: 1, backgroundColor: '#0A0A0A' }}>
        {inner}
      </View>
    </View>
  );
}
